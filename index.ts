import { chromium } from "playwright";
import { mkdir, stat } from "fs/promises";
import { basename } from "path";
import sharp from "sharp";

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
  scopeSelector: string;
  imagesDir: string;
};

async function main(
  targetUrl: string,
  options: Options = {
    scopeSelector: ".ImageGallery",
    imagesDir: "./images",
  }
) {
  await ensureDirExists(options.imagesDir);

  const browser = await chromium.launch({
    headless: true,
    args: ["--window-size=3840,2160"],
  });

  const context = await browser.newContext({
    viewport: { width: 3840, height: 2160 },
  });

  const page = await context.newPage();

  console.log("Navigating to page...");
  await page.goto(targetUrl);

  // Wait for the content to be loaded
  await page.waitForLoadState("domcontentloaded");
  console.log("Extracting image URLs...");

  const imageUrls = await page.$$eval("img", (imgs) =>
    imgs
      .filter((img) => img.naturalHeight > 512 && img.naturalWidth > 512)
      .map((img) => img.src)
      .filter((src) => !!src)
  );

  console.log(`Found ${imageUrls.length} images meeting size requirements.`);

  for (const imageUrl of imageUrls) {
    if (imageUrl.startsWith("http")) {
      await downloadImage(imageUrl, options.imagesDir);
    } else {
      console.warn(`Skipping non-http image URL: ${imageUrl}`);
    }
  }

  await browser.close();
  console.log("All done!");
}

main(
  "https://asuracomic.net/series/the-regressed-mercenarys-machinations-175de8e7/chapter/1"
);
