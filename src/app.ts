import { readdir } from 'node:fs/promises';
import type { Page } from 'playwright';
import sharp from 'sharp';
import type { Integration, SharpConfig } from './integrations/types';
import type { Chapter, ChapterImage } from './types';
import { createBrowser, upsertDir } from './utils';
import { getAllChapters, getMangaName } from './utils';
import { exists } from './utils';

async function chapterRunner(chapter: Chapter, directory: string, page: Page, integration: Integration) {
  console.log(`Processing chapter: ${chapter.name}`);

  await page.goto(chapter.url);
  await page.waitForLoadState('networkidle');

  console.log('Extracting image URLs...');

  const imageUrls = await page.locator(integration.getEnvironment().scopeSelector).evaluate((element: Element): string[] => {
    const imgs = Array.from(element.querySelectorAll('img'));

    return imgs
      .filter((img) => img.naturalHeight > 512 && img.naturalWidth > 512)
      .filter((img) => img.src.startsWith('https://'))
      .map((img) => img.src)
      .filter(Boolean);
  });

  console.log(`Found ${imageUrls.length} images meeting size requirements.`);

  if (imageUrls.length === 0) {
    throw new Error(`No valid images found for chapter ${chapter.name}`);
  }

  const chapterDir = `${directory}/${chapter.name}`;
  await upsertDir(chapterDir);

  // Check for complete downloads
  const existingFiles = await readdir(chapterDir);
  const expectedFileCount = imageUrls.length;

  if (existingFiles.length === expectedFileCount) {
    console.log(`Chapter ${chapter.name} already completely downloaded (${expectedFileCount} files).`);
    return;
  }

  console.log(`Downloading ${imageUrls.length} images for chapter ${chapter.name}...`);

  const imageArr: ChapterImage[] = imageUrls.map((url, index) => ({
    url,
    index,
    name: chapter.name,
    imageName: `page-${index}`,
  }));

  const imagesPack = {
    imageArr,
    chapterDir,
  };

  await downloadImages(imagesPack, page, integration);
}

type ImagesPack = {
  imageArr: ChapterImage[];
  chapterDir: string;
};

async function downloadImages(imagePack: ImagesPack, page: Page, integration: Integration) {
  const { imageArr, chapterDir } = imagePack;
  const format = integration.getEnvironment().sharp.format;
  const options = integration.getEnvironment().sharp.options;

  const downloadPromises = imageArr.map((image) => downloadSingleImage(image, chapterDir, page, format, options));
  await Promise.all(downloadPromises);

  console.log(`Completed downloading images for ${chapterDir}`);
}

async function downloadSingleImage(
  image: ChapterImage,
  chapterDir: string,
  page: Page,
  format: SharpConfig['format'],
  options: SharpConfig['options'],
  retries = 3,
): Promise<void> {
  const fileName = `page-${String(image.index).padStart(3, '0')}.${format}`;
  const filePath = `${chapterDir}/${fileName}`;

  // Check if file already exists
  if (await exists(filePath)) {
    console.log(`File ${fileName} already exists, skipping...`);
    return;
  }

  console.log(`Downloading image ${image.index + 1}: ${image.url}`);

  try {
    const response = await page.request.get(image.url);

    if (!response.ok()) {
      throw new Error(`Failed to download: ${response.status()} ${response.statusText()}`);
    }

    const buffer = await response.body();
    await sharp(buffer)[format](options).toFile(filePath);

    console.log(`Saved ${fileName}`);
  } catch (error) {
    console.error(`Error downloading ${image.url}:`, error);

    if (retries > 0) {
      console.log(`Retrying ${image.url}... (${3 - retries + 1})`);
      await new Promise((resolve) => setTimeout(resolve, 777));
      return downloadSingleImage(image, chapterDir, page, format, options, retries - 1);
    }

    console.error(`Failed to download ${image.url} after multiple attempts`);
  }
}

export async function main(integration: Integration) {
  if (!integration.getEnvironment().pathToSeries) {
    throw new Error('pathToSeries is required');
  }

  console.log('Creating browser...');
  const { browser, context, page } = await createBrowser();

  console.log('Navigating to page...');
  const targetUrl = `${integration.getEnvironment().baseURL}${integration.getEnvironment().pathToSeries}`;

  await page.goto(targetUrl);
  await page.waitForLoadState('domcontentloaded');

  console.log('Determining manga name...');
  const directory = await getMangaName(page, integration);

  console.log('Getting all chapters...');
  const chapters = await getAllChapters(page, integration);

  // Chapter range validation
  const chapterRange = integration.getEnvironment().chapterRange;
  if (chapterRange.length !== 2) {
    throw new Error('Chapter range must be an array of two numbers.');
  }

  if (chapterRange[0] > chapterRange[1]) {
    throw new Error('First chapter must be less than last chapter.');
  }

  if (chapterRange[0] < 1) {
    throw new Error('First chapter must be greater than 1.');
  }

  // Remove chapters outside of range
  for (const chapter of [...chapters]) {
    if (chapter.index < chapterRange[0] - 1 || chapter.index > chapterRange[1] - 1) {
      chapters.splice(chapters.indexOf(chapter), 1);
    }
  }

  console.log(`Found ${chapters.length} chapters in range.`);

  // check if chapter dir exists, if it does, remove from chapters
  for (const chapter of [...chapters]) {
    const chapterDir = `${directory}/${chapter.name}`;
    const dirExists = await exists(chapterDir);

    if (!dirExists) continue;

    console.log(`Chapter ${chapter.name} already exists, skipping...`);
    chapters.splice(chapters.indexOf(chapter), 1);
  }

  for (const chapter of chapters) {
    await chapterRunner(chapter, directory, page, integration);
  }

  await context.close();
  await browser.close();
}
