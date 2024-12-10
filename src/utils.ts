import path from "path";
import type { ChapterImage } from "./lib/types";
import type { Environment, Integration } from "./integrations/types";
import { PlaywrightBlocker } from "@cliqz/adblocker-playwright";
import { Worker } from "worker_threads";
import { firefox, type Page } from "playwright";
import { stat, mkdir } from "fs/promises";

export async function upsertDir(dir: string) {
  try {
    await stat(dir);
  } catch {
    await mkdir(dir, { recursive: true });
  }
}

export async function getMangaName(page: Page, integration: Integration) {
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

export async function getAllChapters(page: Page, integration: Integration) {
  page.setDefaultTimeout(1_000);
  const chapters = await integration.chaptersFinder(page);
  page.setDefaultTimeout(30_000);

  if (chapters.length === 0) {
    throw new Error("No chapters found");
  }
  return chapters;
}

function createImageDownloadWorker(
  chapter: ChapterImage,
  chapterDir: string,
  environment: Environment
): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "worker.ts"));

    worker.on("message", (message) => {
      if (message.success) {
        resolve(message.filename);
      } else {
        reject(new Error(message.error));
      }
    });

    worker.on("error", reject);
    worker.postMessage({
      chapter,
      chapterDir,
      environment,
    });
  });
}

export async function createBrowser() {
  const browser = await firefox.launch({
    headless: true,
  });
  const context = await browser.newContext();

  // Setup the ad blocker
  const blocker = await PlaywrightBlocker.fromLists(fetch, [
    "https://easylist.to/easylist/easylist.txt",
    // more filter lists
    // 'https://easylist-downloads.adblockplus.org/uce.txt',
  ]);

  const page = await context.newPage();
  await blocker.enableBlockingInPage(page);

  return { browser, context, page };
}
