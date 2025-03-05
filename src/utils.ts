import { mkdir, stat } from 'node:fs/promises';
import { PlaywrightBlocker } from '@cliqz/adblocker-playwright';
import { type Page, firefox } from 'playwright';
import type { IntegrationType } from './integrations/integration';
import { integrationRegistry } from './integrations/registry';
import type { Integration } from './integrations/types';

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
    // Replace special characters with white space, remove all double spaces
    const newMangaName = mangaName
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('Using manga name:', mangaName);
    console.log('Converted manga name:', newMangaName);
    return `${integration.getEnvironment().outDir}/${newMangaName}`;
  }

  // Otherwise, use first two path parameters of the URL
  const targetUrlPaths = new URL(page.url()).pathname.split('/').filter(Boolean).join('-');

  console.log('Using target URL paths:', targetUrlPaths);
  return `${integration.getEnvironment().outDir}/${targetUrlPaths}`;
}

export async function getAllChapters(page: Page, integration: Integration) {
  page.setDefaultTimeout(1_000);
  const chapters = await integration.chaptersFinder(page);
  page.setDefaultTimeout(30_000);

  if (chapters.length === 0) {
    throw new Error('No chapters found');
  }
  return chapters;
}

export async function createBrowser() {
  const browser = await firefox.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu'],
  });

  const context = await browser.newContext({
    javaScriptEnabled: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: {
      width: 2560,
      height: 1440,
    },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    bypassCSP: true,
    ignoreHTTPSErrors: true,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    geolocation: { longitude: -73.935242, latitude: 40.73061 },
    permissions: ['geolocation'],
    offline: false,
    // httpCredentials: undefined,
    colorScheme: 'light',
  });

  // Setup the ad blocker
  const blocker = await PlaywrightBlocker.fromLists(fetch, [
    'https://easylist.to/easylist/easylist.txt',
    // more filter lists
    // 'https://easylist-downloads.adblockplus.org/uce.txt',
  ]);

  const page = await context.newPage();
  await blocker.enableBlockingInPage(page);

  return { browser, context, page };
}

export async function exists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export function isIntegration(hostname: string): hostname is IntegrationType {
  return hostname in integrationRegistry;
}
