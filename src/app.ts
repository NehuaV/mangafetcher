import { type Page } from "playwright";
import { readdir } from "fs/promises";
import { createBrowser, upsertDir } from "./utils";
import type { Integration } from "./integrations/types";
import type { Chapter, ChapterImage } from "./lib/types";
import sharp from "sharp";
import { getMangaName, getAllChapters } from "./utils";
import { exists } from "./utils";

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
    console.error("No images found, skipping...");
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

  const chapterDir = `${directory}/${chapter.name}`;
  await upsertDir(chapterDir);

  const existingFiles = await readdir(chapterDir);
  if (imageQueue.length === existingFiles.length) {
    console.warn("All images already downloaded.");
    return;
  }

  const imagesPack = {
    imageQueue,
    chapterDir,
  };
  console.log("Downloading images...", chapter.name);
  await downloadImages(imagesPack, page, integration);
}

type ImagesPack = {
  imageQueue: ChapterImage[];
  chapterDir: string;
};

async function downloadImages(
  imagePack: ImagesPack,
  page: Page,
  integration: Integration
) {
  const downloadPromises = imagePack.imageQueue.map((image) => {
    const downloadImage = async (retries = 3) => {
      console.log(
        `Downloading image ${image.index + 1}/${imagePack.imageQueue.length}: ${image.url}`
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

        const fileName = `page-${String(image.index)}.${integration.environment.fileType}`;
        const filePath = `${imagePack.chapterDir}/${fileName}`;

        await sharp(buffer)
          .withMetadata()
          [integration.environment.fileType!]({
            effort: integration.environment.fileCompressionLevel,
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

export async function main(integration: Integration) {
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

  // Chapter range validation
  const chapterRange = integration.environment.chapterRange;
  if (chapterRange.length !== 2) {
    throw new Error("Chapter range must be an array of two numbers.");
  }

  if (chapterRange[0] > chapterRange[1]) {
    throw new Error("First chapter must be less than last chapter.");
  }

  if (chapterRange[0] < 1) {
    throw new Error("First chapter must be greater than 1.");
  }

  // Remove chapters outside of range
  for (const chapter of [...chapters]) {
    if (
      chapter.index < chapterRange[0] - 1 ||
      chapter.index > chapterRange[1] - 1
    ) {
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
    await runner(chapter, directory, page, integration);
  }

  await context.close();
  await browser.close();
}

// try {
//   const integration = await IntegrationFactory("asuracomic.net")({
//     pathToSeries: "/series/light-of-arad-forerunner-89592507",
//     outDir: "./images",
//     chapterRange: [1, 25],
//   });

//   await main(integration);
// } catch (error) {
//   console.error("Fatal error:", error);
//   process.exit(1);
// } finally {
//   process.exit(0);
// }
