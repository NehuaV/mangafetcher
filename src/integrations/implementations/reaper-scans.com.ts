import { basename } from 'node:path';
import type { Page } from 'playwright';
import type { Chapter, Result } from '../../types.ts';
import { BaseIntegration } from '../base.ts';
import { defaultEnvironment } from '../index.ts';
import type { Environment, IntegrationParams } from '../types.ts';

export default class ReaperScansCom extends BaseIntegration {
  getIntegrationType(): string {
    return basename(import.meta.filename, '.ts');
  }

  createEnvironment(params: IntegrationParams, url: URL): Environment {
    return {
      ...defaultEnvironment,
      pathToSeries: url.pathname,
      outDir: params.outDir ?? defaultEnvironment.outDir,
      sharp: params.sharp ?? defaultEnvironment.sharp,
      chapterRange: params.chapterRange ?? defaultEnvironment.chapterRange,
      concurrency: params.concurrency ?? defaultEnvironment.concurrency,

      baseURL: url.origin,
      titleSelectors: ['//html/body/div/div[2]/div[1]/div[2]/div[1]/article/div[1]/div/div[2]/div[1]/div[1]/h1'],
      chaptersSelectors: ['//html/body/div/div[2]/div[1]/div[2]/div[1]/article/div[3]/div[3]/ul'],
      scopeSelector: '//html/body/div/div[2]/div[1]/div/div/article/div[2]',
    };
  }

  async chaptersFinder(page: Page): Promise<Result<Chapter[]>> {
    return this.findChapters(page, 'span', (href) => new URL(href, this.environment.baseURL).toString());
  }
}
