import { basename } from 'node:path';
import type { Page } from 'playwright';
import type { Chapter, Result } from '../../types.ts';
import { BaseIntegration } from '../base.ts';
import { defaultEnvironment } from '../index.ts';
import type { Environment, IntegrationParams } from '../types.ts';

export default class AsurascansCom extends BaseIntegration {
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
      titleSelectors: ['//html/body/div/main/div[1]/div[4]/div/div[2]/article/h1'],
      chaptersSelectors: ['//html/body/div/main/div[1]/div[4]/div/div[2]/div[3]/astro-island/div/div[2]/div'],
      scopeSelector: '//html/body/main/astro-island/div/div[2]',
    };
  }

  async chaptersFinder(page: Page): Promise<Result<Chapter[]>> {
    return this.findChapters(page, 'span', (href) => {
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return href;
      }
      if (href.startsWith('/')) {
        return new URL(href, this.environment.baseURL).toString();
      }
      return new URL(`/series/${href}`, this.environment.baseURL).toString();
    });
  }
}
