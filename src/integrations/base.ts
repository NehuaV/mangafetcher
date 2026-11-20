import type { Page } from 'playwright';
import { type Chapter, err, ok, type Result, tryCatch } from '../types.ts';
import type { Environment, IntegrationParams } from './types.ts';

export abstract class BaseIntegration {
  protected environment: Environment;
  readonly type: string;

  constructor(params: IntegrationParams) {
    const url = new URL(params.URL);

    if (!url.hostname || !url.pathname) {
      throw new Error('URL must be a valid URL');
    }

    this.type = this.getIntegrationType();

    if (this.type !== url.hostname) {
      throw new Error(`Integration type "${this.type}" does not match URL hostname "${url.hostname}"`);
    }

    this.environment = this.createEnvironment(params, url);
  }

  getEnvironment(): Environment {
    return this.environment;
  }

  async titleFinder(page: Page): Promise<Result<string>> {
    for (const selector of this.environment.titleSelectors) {
      const [headingText] = await tryCatch(() => page.locator(selector).textContent());
      const trimmed = headingText?.trim();
      if (trimmed) {
        return ok(trimmed);
      }
    }

    return ok('');
  }

  protected async findChapters(page: Page, nameSelector: string, resolveUrl: (href: string) => string): Promise<Result<Chapter[]>> {
    const chapters: Chapter[] = [];

    for (const selector of this.environment.chaptersSelectors) {
      const [rawChapters, evalError] = await tryCatch(() =>
        page.locator(selector).evaluate((container: Element, nameSel: string) => {
          const children = Array.from(container.children).reverse();
          return children
            .map((child) => {
              const anchor = child.tagName === 'A' ? child : child.querySelector('a');
              if (!anchor) {
                return null;
              }
              const href = anchor.getAttribute('href') ?? '';
              const nameEl = anchor.querySelector(nameSel);
              const name = nameEl?.textContent?.trim() ?? '';
              return { href, name };
            })
            .filter((item): item is { href: string; name: string } => item !== null && Boolean(item.href));
        }, nameSelector),
      );

      if (evalError) {
        return err(evalError);
      }

      if (rawChapters.length === 0) {
        continue;
      }

      for (const [i, item] of rawChapters.entries()) {
        chapters.push({
          url: resolveUrl(item.href),
          index: i,
          name: item.name || `Chapter ${i + 1}`,
        });
      }

      // Stop after the first selector that yields chapters to avoid duplicates.
      break;
    }

    return ok(chapters);
  }

  abstract chaptersFinder(page: Page): Promise<Result<Chapter[]>>;
  abstract createEnvironment(params: IntegrationParams, url: URL): Environment;
  abstract getIntegrationType(): string;
}
