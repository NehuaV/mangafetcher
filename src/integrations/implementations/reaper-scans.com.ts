import type { Chapter } from '@/types';
import type { Page } from 'playwright';
import { defaultEnvironment } from '..';
import { BaseIntegration } from '../base';
import type { IntegrationParams } from '../types';

export class ReaperScansCom extends BaseIntegration {
  getIntegrationType(): string {
    return 'reaper-scans.com';
  }

  createEnvironment(params: IntegrationParams, url: URL) {
    return {
      ...defaultEnvironment,
      pathToSeries: url.pathname,
      outDir: params.outDir,
      sharp: params.sharp || defaultEnvironment.sharp,
      chapterRange: params.chapterRange,

      baseURL: url.origin,
      scopeSelector: '//html/body/div/div[2]/div[1]/div/div/article/div[2]',
      titleSelectors: ['//html/body/div/div[2]/div[1]/div[2]/div[1]/article/div[1]/div/div[2]/div[1]/div[1]/h1'],
      chaptersSelectors: ['//html/body/div/div[2]/div[1]/div[2]/div[1]/article/div[3]/div[3]/ul'],
    };
  }

  async titleFinder(page: Page): Promise<string> {
    const xpaths = this.environment.titleSelectors;

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

    return '';
  }

  async chaptersFinder(page: Page): Promise<Chapter[]> {
    const xpaths = this.environment.chaptersSelectors;

    const chapters: Chapter[] = [];

    for (const xpath of xpaths) {
      // Get all child elements from the chapter list container
      const listofChapterElements = await page.locator(`${xpath}/*`).count();

      for (let i = 0; i < listofChapterElements; i++) {
        // Get all elements in reverse order
        const element = page.locator(`${xpath}/*`).nth(listofChapterElements - i - 1);

        // Get Inner a tag and its href attribute
        const aTag = element.locator('a');
        const urlPathName = await aTag.getAttribute('href');
        const name = await aTag.locator('span').nth(0).innerText();

        chapters.push({
          url: urlPathName || '',
          index: i,
          name: name || `Chapter ${i + 1} ()`,
        });
      }
    }

    return chapters;
  }
}
