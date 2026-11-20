import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PlaywrightBlocker } from '@ghostery/adblocker-playwright';
import { type Browser, type BrowserContext, firefox, type Page } from 'playwright';
import type { Integration } from './integrations/types.ts';
import { type Chapter, err, ok, type Result, tryCatch } from './types.ts';

export type BrowserSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
};

export function sanitizePathSegment(name: string): string {
  const sanitized = name
    .replace(/[^a-zA-Z0-9._-]/g, ' ')
    .replace(/\.{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return sanitized || 'untitled';
}

export async function exists(filePath: string): Promise<boolean> {
  const [, error] = await tryCatch(() => stat(filePath));
  return error === null;
}

export async function upsertDir(dir: string): Promise<Result<void>> {
  if (await exists(dir)) {
    return ok(undefined);
  }
  const [, error] = await tryCatch(() => mkdir(dir, { recursive: true }));
  if (error) {
    return err(error);
  }
  return ok(undefined);
}

export async function getMangaName(page: Page, integration: Integration): Promise<Result<string>> {
  page.setDefaultTimeout(1_000);
  const [mangaName, titleError] = await integration.titleFinder(page);
  page.setDefaultTimeout(30_000);

  if (titleError) {
    return err(titleError);
  }

  const outDir = integration.getEnvironment().outDir;

  if (mangaName) {
    const newMangaName = sanitizePathSegment(mangaName);
    console.log('Using manga name:', mangaName);
    console.log('Converted manga name:', newMangaName);
    return ok(join(outDir, newMangaName));
  }

  const targetUrlPaths = sanitizePathSegment(new URL(page.url()).pathname.split('/').filter(Boolean).join('-'));
  console.log('Using target URL paths:', targetUrlPaths);
  return ok(join(outDir, targetUrlPaths));
}

export async function getAllChapters(page: Page, integration: Integration): Promise<Result<Chapter[]>> {
  page.setDefaultTimeout(1_000);
  const [chapters, chaptersError] = await integration.chaptersFinder(page);
  page.setDefaultTimeout(30_000);

  if (chaptersError) {
    return err(chaptersError);
  }

  if (chapters.length === 0) {
    return err(new Error('No chapters found'));
  }

  return ok(chapters);
}

export function filterChaptersByRange(chapters: readonly Chapter[], chapterRange: readonly [number, number]): Result<Chapter[]> {
  if (chapterRange.length !== 2) {
    return err(new Error('Chapter range must be an array of two numbers.'));
  }

  const [start, end] = chapterRange;
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return err(new Error('Chapter range bounds must be finite numbers.'));
  }

  if (start < 1) {
    return err(new Error('First chapter must be at least 1.'));
  }

  if (start > end) {
    return err(new Error('First chapter must be less than or equal to last chapter.'));
  }

  const filtered = chapters.filter((chapter) => chapter.index >= start - 1 && chapter.index <= end - 1);
  return ok(filtered);
}

export async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<Result<void>>,
): Promise<Result<void>> {
  const concurrency = Math.max(1, Math.floor(limit));
  let nextIndex = 0;
  const errors: Error[] = [];

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const item = items[currentIndex];
      if (item === undefined) {
        continue;
      }
      const [, error] = await worker(item);
      if (error) {
        errors.push(error);
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  if (errors.length > 0) {
    return err(new AggregateError(errors, `${errors.length} task(s) failed: ${errors[0]?.message ?? 'unknown error'}`));
  }

  return ok(undefined);
}

export async function createBrowser(): Promise<Result<BrowserSession>> {
  const [browser, launchError] = await tryCatch(() =>
    firefox.launch({
      headless: true,
    }),
  );
  if (launchError) {
    return err(launchError);
  }

  const [context, contextError] = await tryCatch(() =>
    browser.newContext({
      javaScriptEnabled: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:138.0) Gecko/20100101 Firefox/138.0',
      viewport: {
        width: 2560,
        height: 1440,
      },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      bypassCSP: true,
      locale: 'en-US',
      timezoneId: 'America/New_York',
      colorScheme: 'light',
    }),
  );
  if (contextError) {
    await browser.close().catch(() => undefined);
    return err(contextError);
  }

  const [page, pageError] = await tryCatch(() => context.newPage());
  if (pageError) {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
    return err(pageError);
  }

  const [, cacheDirError] = await upsertDir('.cache');
  if (!cacheDirError) {
    const [blocker, blockerError] = await tryCatch(() =>
      PlaywrightBlocker.fromLists(fetch, ['https://easylist.to/easylist/easylist.txt'], undefined, {
        path: '.cache/easylist.bin',
        read: readFile,
        write: writeFile,
      }),
    );
    if (blockerError) {
      console.warn('Adblocker initialization failed, continuing without adblocker:', blockerError.message);
    } else {
      await blocker.enableBlockingInPage(page);
    }
  }

  return ok({ browser, context, page });
}
