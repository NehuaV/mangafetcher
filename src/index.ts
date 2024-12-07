// import fetch from "cross-fetch"; // If bun poses problems, uncomment this & install
import { readdir } from "fs/promises";
import { type Page } from "playwright";
import { createBrowser, createImageDownloadWorker, upsertDir } from "./utils";
import { Queue } from "./lib/queue";
import {
  CreateIntegration,
  CreateEnvironment,
  type Integration,
} from "./drivers";
import type { Chapter } from "./lib/types";

async function runner(chapter: Chapter, page: Page, integration: Integration) {
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

  console.log("Feeding into queue...");
  const imageQueue = new Queue<Chapter>();
  for (const [index, url] of imageUrls.entries()) {
    imageQueue.enqueue({ url, index, name: `page-${index}` });
  }

  try {
    const existingFiles = await readdir(integration.environment.outDir);
    if (imageQueue.size() === existingFiles.length) {
      console.log("All images already downloaded.");
      await page.close();
      return;
    }

    await downloadImagesParallel(imageQueue, integration.environment.outDir);
    console.log("All downloads completed successfully!");
  } catch (error) {
    console.error("Error in main:", error);
    throw error;
  } finally {
    await page.close();
  }
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

async function downloadImagesParallel(
  imageQueue: Queue<Chapter>,
  directory: string
) {
  // Makes device cpu's cores available
  const maxConcurrent =
    navigator.hardwareConcurrency > 1 ? navigator.hardwareConcurrency - 1 : 1;
  const active = new Set<Promise<string | null>>();
  const results: Promise<string | null>[] = [];

  try {
    while (imageQueue.size() > 0 || active.size > 0) {
      while (imageQueue.size() > 0 && active.size < maxConcurrent) {
        const chapter = imageQueue.dequeue()!;
        if (!chapter.url.startsWith("http")) {
          console.warn(`Skipping non-http image URL: ${chapter.url}`);
          continue;
        }

        const promise = createImageDownloadWorker(chapter, directory)
          .then((filename) => {
            active.delete(promise);
            console.log(`Downloaded: ${filename}`);
            return filename;
          })
          .catch((error) => {
            active.delete(promise);
            console.error(`Error downloading ${chapter.url}: ${error.message}`);
            return null;
          });

        active.add(promise);
        results.push(promise);
      }

      if (active.size > 0) {
        await Promise.race(active);
      }
    }

    // Wait for all remaining promises to complete
    await Promise.all(results);
  } catch (error) {
    console.error("Error in parallel download:", error);
    throw error;
  }

  return (await Promise.all(results)).filter(Boolean);
}

async function main(integration: Integration) {
  if (!integration.environment.pathToSeries) {
    throw new Error("pathToSeries is required");
  }

  console.log("Upserting image directory...");
  await upsertDir(integration.environment.outDir);

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

  console.log("Chapters:", chapters);

  console.log("Upserting directory:", directory);
  await upsertDir(directory);

  for (const chapter of chapters) {
    await runner(chapter, page, integration);
  }

  await context.close();
  await browser.close();
}

try {
  const environment = CreateEnvironment({
    baseURL: "https://asuracomic.net",
    pathToSeries: "/series/the-regressed-mercenarys-machinations-8693b675",
    outDir: "./images",
    scopeSelector: "//html/body/div[3]/div/div/div/div[5]",
    titleSelectors: [
      "//html/body/div[3]/div/div/div/div[1]/div/div[1]/div[1]/div[2]/div[1]/div[2]/div[1]/span",
    ],
    chaptersSelectors: [
      "//html/body/div[3]/div/div/div/div[1]/div/div[1]/div[2]/div[3]/div[2]",
    ],
  });
  const integration = CreateIntegration(environment, {
    titleFinder: async (page: Page) => {
      const xpaths = environment.titleSelectors;

      for (const xpath of xpaths) {
        const headingText = await page
          .locator(xpath)
          .innerText()
          .catch(() => null);

        if (headingText) {
          page.setDefaultTimeout(30_000);
          return `${headingText}`;
        }
      }

      return "";
    },
    chaptersFinder: async (page: Page) => {
      const xpaths = environment.chaptersSelectors;

      const chapters: Chapter[] = [];

      for (const xpath of xpaths) {
        // Get all child elements from the chapter list container
        const listofChapterElements = await page.locator(`${xpath}/*`).count();

        for (let i = 0; i < listofChapterElements; i++) {
          // Get all elements in reverse order
          const element = page
            .locator(`${xpath}/*`)
            .nth(listofChapterElements - i - 1);

          // Get Inner a tag and its href attribute
          const aTag = element.locator("a");
          const urlPathName = await aTag.getAttribute("href");
          const name = await aTag.innerText();

          const url = `${integration.environment.baseURL}/${urlPathName}`;

          chapters.push({
            url: url || "",
            index: i,
            name: name || `Chapter ${i + 1} ()`,
          });
        }
      }

      return chapters;
    },
  });

  await main(integration);
} catch (error) {
  console.error("Fatal error:", error);
  process.exit(1);
} finally {
  process.exit(0);
}
