import { firefox, type BrowserContext } from "playwright";
import { readdir } from "fs/promises";
import { PlaywrightBlocker } from "@cliqz/adblocker-playwright";
import { createImageDownloadWorker, ensureDirExists } from "./utils";
// import fetch from "cross-fetch"; // If bun poses problems, uncomment this & install

type Options = {
  scopeSelector: string; // XPath for scoping
  imagesDir: string; // Directory to save images
};

async function main(
  targetUrl: string,
  context: BrowserContext,
  options: Options = {
    scopeSelector: "//html/body",
    imagesDir: "./images",
  }
) {
  const targetUrlPaths = new URL(targetUrl).pathname.split("/").slice(2, 5);
  const len = targetUrlPaths.length;
  targetUrlPaths[len - 2] = targetUrlPaths[len - 2] + targetUrlPaths[len - 1];
  targetUrlPaths.pop();
  const fullPath = targetUrlPaths.join("/");

  const directory = `${options.imagesDir}/${fullPath}`;
  console.log("Upserting directory:", directory);
  await ensureDirExists(directory);

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

  try {
    const existingFiles = await readdir(directory);
    if (imageUrls.length === existingFiles.length) {
      console.log("All images already downloaded.");
      await page.close();
      return;
    }

    await downloadImagesParallel(imageUrls, directory);
    console.log("All downloads completed successfully!");
  } catch (error) {
    console.error("Error in main:", error);
    throw error;
  } finally {
    await page.close();
  }
}

async function downloadImagesParallel(imageUrls: string[], directory: string) {
  // Makes device cpu's cores available
  const maxConcurrent =
    navigator.hardwareConcurrency > 1 ? navigator.hardwareConcurrency - 1 : 1;
  const queue = [...imageUrls];
  const active = new Set<Promise<string | null>>();
  const results: Promise<string | null>[] = [];

  try {
    while (queue.length > 0 || active.size > 0) {
      while (queue.length > 0 && active.size < maxConcurrent) {
        const url = queue.shift()!;
        if (!url.startsWith("http")) {
          console.warn(`Skipping non-http image URL: ${url}`);
          continue;
        }

        const promise = createImageDownloadWorker(url, directory)
          .then((filename) => {
            active.delete(promise);
            console.log(`Downloaded: ${filename}`);
            return filename;
          })
          .catch((error) => {
            active.delete(promise);
            console.error(`Error downloading ${url}: ${error.message}`);
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
    await main(chapter, context, {
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
