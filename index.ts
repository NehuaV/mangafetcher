import { firefox, type BrowserContext } from "playwright";
import { mkdir, stat, readdir } from "fs/promises";
import { basename } from "path";
import sharp from "sharp";
import { PlaywrightBlocker } from "@cliqz/adblocker-playwright";
// import fetch from "cross-fetch"; // If bun poses problems, uncomment this & install

async function ensureDirExists(dir: string) {
  try {
    await stat(dir);
  } catch {
    await mkdir(dir, { recursive: true });
  }
}

async function downloadImage(url: string, directory: string): Promise<void> {
  const filename = basename(url.split("?")[0]);
  const filePath = `${directory}/${filename}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.statusText}`);
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    await sharp(arrayBuffer)
      .webp({
        quality: 80,
        effort: 6,
      })
      .toFile(filePath);
    console.log(`Downloaded: ${filename}`);
  } catch (error: any) {
    console.error(`Error downloading ${url}: ${error.message}`);
  }
}

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

  // Setup the ad blocker before creating pages
  const blocker = await PlaywrightBlocker.fromLists(fetch, [
    "https://easylist.to/easylist/easylist.txt",
    // You can add more filter lists if you like
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

  // If images count are the same as the number of images in the directory, we are done
  if (imageUrls.length === (await readdir(directory)).length) {
    console.log("All images already downloaded.");
    await page.close();
    return;
  }

  for (const imageUrl of imageUrls) {
    if (imageUrl.startsWith("http")) {
      await downloadImage(imageUrl, directory);
    } else {
      console.warn(`Skipping non-http image URL: ${imageUrl}`);
    }
  }

  await page.close();
  console.log("All done!");
}

const chapterarr = [
  "https://asuracomic.net/series/the-regressed-mercenarys-machinations-175de8e7/chapter/1",
  "https://asuracomic.net/series/the-regressed-mercenarys-machinations-175de8e7/chapter/2",
];

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
process.exit(0);
