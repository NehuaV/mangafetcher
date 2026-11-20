import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Page } from 'playwright';
import sharp from 'sharp';
import type { Integration, SharpConfig } from './integrations/types.ts';
import { type Chapter, type ChapterImage, err, ok, type Result, tryCatch } from './types.ts';
import {
  createBrowser,
  exists,
  filterChaptersByRange,
  getAllChapters,
  getMangaName,
  runWithConcurrency,
  sanitizePathSegment,
  upsertDir,
} from './utils.ts';

type ImagesPack = {
  imageArr: ChapterImage[];
  chapterDir: string;
};

async function chapterRunner(chapter: Chapter, directory: string, page: Page, integration: Integration): Promise<Result<void>> {
  console.log(`Processing chapter: ${chapter.name}`);

  const [, gotoError] = await tryCatch(async () => {
    await page.goto(chapter.url);
    await page.waitForLoadState('networkidle');
  });
  if (gotoError) {
    return err(new Error(`Failed to load chapter ${chapter.name}: ${gotoError.message}`));
  }

  console.log('Extracting image URLs...');

  const [imageUrls, evalError] = await tryCatch(() =>
    page.locator(integration.getEnvironment().scopeSelector).evaluate((element: Element): string[] => {
      const imgs = Array.from(element.querySelectorAll('img'));

      return imgs
        .filter((img) => img.naturalHeight > 512 && img.naturalWidth > 512)
        .filter((img) => img.src.startsWith('https://'))
        .map((img) => img.src)
        .filter(Boolean);
    }),
  );
  if (evalError) {
    return err(new Error(`Failed to extract images for chapter ${chapter.name}: ${evalError.message}`));
  }

  console.log(`Found ${imageUrls.length} images meeting size requirements.`);

  if (imageUrls.length === 0) {
    return err(new Error(`No valid images found for chapter ${chapter.name}`));
  }

  const safeChapterName = sanitizePathSegment(chapter.name);
  const chapterDir = join(directory, safeChapterName);
  const [, dirError] = await upsertDir(chapterDir);
  if (dirError) {
    return err(dirError);
  }

  const [existingFiles, readError] = await tryCatch(() => readdir(chapterDir));
  if (readError) {
    return err(readError);
  }

  const expectedFileCount = imageUrls.length;
  if (existingFiles.length === expectedFileCount) {
    console.log(`Chapter ${chapter.name} already completely downloaded (${expectedFileCount} files).`);
    return ok(undefined);
  }

  console.log(`Downloading ${imageUrls.length} images for chapter ${chapter.name}...`);

  const imageArr: ChapterImage[] = imageUrls.map((url, index) => ({
    url,
    index,
    name: chapter.name,
    imageName: `page-${index}`,
  }));

  const imagesPack: ImagesPack = {
    imageArr,
    chapterDir,
  };

  return downloadImages(imagesPack, page, integration);
}

async function downloadImages(imagePack: ImagesPack, page: Page, integration: Integration): Promise<Result<void>> {
  const { imageArr, chapterDir } = imagePack;
  const { sharp: sharpConfig, concurrency } = integration.getEnvironment();

  const [, downloadError] = await runWithConcurrency(imageArr, concurrency, (image) =>
    downloadSingleImage(image, chapterDir, page, sharpConfig.format, sharpConfig.options),
  );
  if (downloadError) {
    return err(downloadError);
  }

  console.log(`Completed downloading images for ${chapterDir}`);
  return ok(undefined);
}

async function downloadSingleImage(
  image: ChapterImage,
  chapterDir: string,
  page: Page,
  format: SharpConfig['format'],
  options: SharpConfig['options'],
  retries = 3,
): Promise<Result<void>> {
  const fileName = `page-${String(image.index).padStart(3, '0')}.${format}`;
  const filePath = join(chapterDir, fileName);

  if (await exists(filePath)) {
    console.log(`File ${fileName} already exists, skipping...`);
    return ok(undefined);
  }

  console.log(`Downloading image ${image.index + 1}: ${image.url}`);

  const [, downloadError] = await tryCatch(async () => {
    const response = await page.request.get(image.url);

    if (!response.ok()) {
      throw new Error(`Failed to download: ${response.status()} ${response.statusText()}`);
    }

    const buffer = await response.body();
    await sharp(buffer)[format](options).toFile(filePath);
    console.log(`Saved ${fileName}`);
  });

  if (!downloadError) {
    return ok(undefined);
  }

  console.error(`Error downloading ${image.url}:`, downloadError.message);

  if (retries > 0) {
    console.log(`Retrying ${image.url}... (${3 - retries + 1})`);
    await new Promise((resolve) => setTimeout(resolve, 777));
    return downloadSingleImage(image, chapterDir, page, format, options, retries - 1);
  }

  return err(new Error(`Failed to download ${image.url} after multiple attempts: ${downloadError.message}`));
}

export async function main(integration: Integration): Promise<Result<void>> {
  const env = integration.getEnvironment();
  if (!env.pathToSeries) {
    return err(new Error('pathToSeries is required'));
  }

  console.log('Creating browser...');
  const [session, browserError] = await createBrowser();
  if (browserError) {
    return err(browserError);
  }

  try {
    const { page } = session;
    console.log('Navigating to page...');
    const targetUrl = `${env.baseURL}${env.pathToSeries}`;

    const [, navError] = await tryCatch(async () => {
      await page.goto(targetUrl);
      await page.waitForLoadState('domcontentloaded');
    });
    if (navError) {
      return err(new Error(`Failed to navigate to ${targetUrl}: ${navError.message}`));
    }

    console.log('Determining manga name...');
    const [directory, dirError] = await getMangaName(page, integration);
    if (dirError) {
      return err(dirError);
    }

    console.log('Getting all chapters...');
    const [allChapters, chaptersError] = await getAllChapters(page, integration);
    if (chaptersError) {
      return err(chaptersError);
    }

    const [chapters, rangeError] = filterChaptersByRange(allChapters, env.chapterRange);
    if (rangeError) {
      return err(rangeError);
    }

    console.log(`Found ${chapters.length} chapters in range.`);

    for (const chapter of chapters) {
      const [, chapterError] = await chapterRunner(chapter, directory, page, integration);
      if (chapterError) {
        return err(chapterError);
      }
    }

    return ok(undefined);
  } finally {
    await session.context.close().catch(() => undefined);
    await session.browser.close().catch(() => undefined);
  }
}
