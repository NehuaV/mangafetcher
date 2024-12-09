// import fetch from "cross-fetch"; // If bun poses problems, uncomment this & install
import { readdir } from "fs/promises";
import { type Page } from "playwright";
import { createBrowser, upsertDir } from "./utils";
import { type Integration, IntegrationFactory } from "./integrations";
import type { Chapter, ChapterImage } from "./lib/types";
import sharp from "sharp";

async function runner(
  chapter: Chapter,
  directory: string,
  page: Page,
  integration: Integration
) {
  console.log("Navigating to chapter...");
  await page.goto(chapter.url);
  await page.waitForLoadState("networkidle");

  console.log("Extracting image URLs...");
  const imageUrls = await page
    .locator(integration.environment.scopeSelector)
    .evaluate((element: Element): string[] => {
      const imgs = Array.from(element.querySelectorAll("img"));
      return imgs
        .filter((img) => img.naturalHeight > 512 && img.naturalWidth > 512)
        .map((img) => img.src)
        .filter((src) => !!src);
    });

  console.log(`Found ${imageUrls.length} images meeting size requirements.`);

  if (imageUrls.length === 0) {
    console.log("No images found, skipping...");
    throw new Error("No images found");
  }

  console.log("Feeding into queue...");
  const imageQueue: ChapterImage[] = [];
  for (const [index, url] of imageUrls.entries()) {
    imageQueue.push({
      url,
      index,
      name: chapter.name,
      imageName: `page-${index}`,
    });
  }

  try {
    const chapterDir = `${directory}/${chapter.name}`;
    await upsertDir(chapterDir);
    const existingFiles = await readdir(chapterDir);
    if (imageQueue.length === existingFiles.length) {
      console.log("All images already downloaded.");
      return;
    }

    console.log("Downloading images...", chapter.name);
    await downloadImages(imageQueue, chapterDir, page);
  } catch (error) {
    console.error("Error in main:", error);
    throw error;
  }
}

async function downloadImages(
  imageQueue: ChapterImage[],
  chapterDir: string,
  page: Page
) {
  const downloadPromises = imageQueue.map((image) => {
    const downloadImage = async (retries = 3) => {
      console.log(
        `Downloading image ${image.index + 1}/${imageQueue.length}: ${image.url}`
      );

      try {
        const response = await page.request.get(image.url);

        if (!response.ok()) {
          console.error(
            `Failed to download ${image.url}: ${response.status()} ${response.statusText()}`
          );
          return;
        }

        // Get the binary data
        const buffer = await response.body();

        const fileName = `page-${String(image.index)}.webp`;
        const filePath = `${chapterDir}/${fileName}`;

        await sharp(buffer)
          .withMetadata()
          .webp({
            effort: 6,
          })
          .toFile(filePath);

        console.log(`Saved ${fileName}`);
      } catch (error) {
        console.error(`Error downloading ${image.url}:`, error);
        if (retries > 0) {
          console.log(`Retrying ${image.url}... (${3 - retries + 1})`);
          await downloadImage(retries - 1);
        }
      }
    };

    return downloadImage();
  });

  await Promise.allSettled(downloadPromises);
}

async function getMangaName(page: Page, integration: Integration) {
  page.setDefaultTimeout(1_000);
  const mangaName = await integration.titleFinder(page);
  page.setDefaultTimeout(30_000);

  if (mangaName) {
    const newMangaName = mangaName.toLowerCase();
    console.log("Using manga name:", mangaName);
    console.log("Converted manga name:", newMangaName);
    return `${integration.environment.outDir}/${newMangaName}`;
  }

  // Otherwise, use first two path parameters of the URL
  const targetUrlPaths = new URL(page.url()).pathname
    .split("/")
    .filter(Boolean)
    .join("-");

  console.log("Using target URL paths:", targetUrlPaths);
  return `${integration.environment.outDir}/${targetUrlPaths}`;
}

async function getAllChapters(page: Page, integration: Integration) {
  page.setDefaultTimeout(1_000);
  const chapters = await integration.chaptersFinder(page);
  page.setDefaultTimeout(30_000);

  if (chapters.length === 0) {
    throw new Error("No chapters found");
  }
  return chapters;
}

async function main(integration: Integration) {
  if (!integration.environment.pathToSeries) {
    throw new Error("pathToSeries is required");
  }

  console.log("Creating browser...");
  const { browser, context, page } = await createBrowser();

  console.log("Navigating to page...");
  const targetUrl = `${integration.environment.baseURL}${integration.environment.pathToSeries}`;
  await page.goto(targetUrl);
  await page.waitForLoadState("networkidle");

  console.log("Determining manga name...");
  const directory = await getMangaName(page, integration);

  console.log("Getting all chapters...");
  const chapters = await getAllChapters(page, integration);

  for (const chapter of chapters) {
    await runner(chapter, directory, page, integration);
  }

  await context.close();
  await browser.close();
}

try {
  const integration = await IntegrationFactory("asuracomic")({
    environment: {
      pathToSeries: "/series/light-of-arad-forerunner-89592507",
    },
    integration: {},
  });

  await main(integration);
} catch (error) {
  console.error("Fatal error:", error);
  process.exit(1);
} finally {
  process.exit(0);
}
