import { firefox, type BrowserContext, type Page } from "playwright";
import { readdir } from "fs/promises";
import { PlaywrightBlocker } from "@cliqz/adblocker-playwright";
import { createImageDownloadWorker, upsertDir } from "./utils";
import { Queue } from "./lib/queue";
import type { Chapter } from "./lib/types";
// import fetch from "cross-fetch"; // If bun poses problems, uncomment this & install

type Options = {
  scopeSelector: string; // XPath for scoping
  imagesDir: string; // Directory to save images
};

async function runner(
  targetUrl: string,
  context: BrowserContext,
  options: Options = {
    scopeSelector: "//html/body",
    imagesDir: "./images",
  }
) {
  console.log("Upserting image directory...");
  await upsertDir(options.imagesDir);

  // Setup the ad blocker
  const blocker = await PlaywrightBlocker.fromLists(fetch, [
    "https://easylist.to/easylist/easylist.txt",
    // more filter lists
    // 'https://easylist-downloads.adblockplus.org/uce.txt',
  ]);

  const page = await context.newPage();
  await blocker.enableBlockingInPage(page);

  console.log("Navigating to page...");
  await page.goto(targetUrl);
  await page.waitForLoadState("networkidle");

  console.log("Determining manga name...");
  const directory = await getMangaName(page, options.imagesDir);

  // Get All Chapters
  const chapters = await getAllChapters(page);

  console.log("Upserting directory:", directory);
  await upsertDir(directory);

  console.log("Extracting image URLs...");

  const imageUrls = await page
    .locator(options.scopeSelector)
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
    const existingFiles = await readdir(directory);
    if (imageQueue.size() === existingFiles.length) {
      console.log("All images already downloaded.");
      await page.close();
      return;
    }

    await downloadImagesParallel(imageQueue, directory);
    console.log("All downloads completed successfully!");
  } catch (error) {
    console.error("Error in main:", error);
    throw error;
  } finally {
    await page.close();
  }
}

async function getMangaName(page: Page, imagesDir: string) {
  // Use heading if available
  const headings = ["h1", "h2"];
  page.setDefaultTimeout(1_000);

  for (const heading of headings) {
    const headingText = await page
      .locator(heading)
      .nth(0)
      .innerText()
      .catch(() => null);

    if (headingText) {
      page.setDefaultTimeout(30_000);
      return `${imagesDir}/${headingText}`;
    }
  }
  page.setDefaultTimeout(30_000);

  // Otherwise, use first two path parameters of the URL
  const targetUrlPaths = new URL(page.url()).pathname
    .split("/")
    .filter(Boolean)
    .join("-");

  console.log("Using target URL paths:", targetUrlPaths);
  return `${imagesDir}/${targetUrlPaths}`;
}

async function getAllChapters(page: Page) {
  throw new Error("Not implemented");
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

const chapterarr = [
  "https://asuracomic.net/series/the-regressed-mercenarys-machinations-175de8e7/chapter/1",
  "https://asuracomic.net/series/the-regressed-mercenarys-machinations-175de8e7/chapter/2",
];

try {
  const browser = await firefox.launch({
    headless: true,
  });
  const context = await browser.newContext();

  for (const chapter of chapterarr) {
    await runner(chapter, context, {
      scopeSelector: "//html/body/div[3]/div/div/div/div[5]/div",
      imagesDir: "./images",
    });
  }

  await context.close();
  await browser.close();
} catch (error) {
  console.error("Fatal error:", error);
  process.exit(1);
} finally {
  process.exit(0);
}
