import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Page } from 'playwright';
import { MangaFetcher } from '../src/index.ts';
import { createIntegration } from '../src/integrations/index.ts';

function createMockPage(selectors: { title?: string; chaptersBySelector: Record<string, Array<{ href: string; name: string }>> }): Page {
  return {
    locator(selector: string) {
      return {
        async textContent() {
          if (selectors.title && (selector.includes('h1') || selector.includes('span'))) {
            return selectors.title;
          }
          throw new Error('not found');
        },
        async evaluate<T, Arg>(fn: (el: Element, arg: Arg) => T, arg: Arg): Promise<T> {
          const items = selectors.chaptersBySelector[selector] ?? [];
          const fakeContainer = {
            children: items.map((item) => ({
              tagName: 'A',
              getAttribute(attr: string) {
                return attr === 'href' ? item.href : null;
              },
              querySelector() {
                return { textContent: item.name };
              },
            })),
          } as unknown as Element;
          return fn(fakeContainer, arg);
        },
      };
    },
  } as unknown as Page;
}

describe('createIntegration', () => {
  it('rejects unknown or traversal hostnames', async () => {
    const [bad1, err1] = await createIntegration('../base', { URL: 'https://asurascans.com/comics/test' });
    assert.equal(bad1, null);
    assert.match(err1?.message ?? '', /Invalid integration hostname/);

    const [bad2, err2] = await createIntegration('unknown.example', { URL: 'https://unknown.example/series/test' });
    assert.equal(bad2, null);
    assert.match(err2?.message ?? '', /not found/);
  });

  it('loads asurascans.com and extracts chapters without duplicate selector matches', async () => {
    const [integration, error] = await createIntegration('asurascans.com', {
      URL: 'https://asurascans.com/comics/test-series',
    });
    assert.equal(error, null);
    assert.ok(integration);

    const selectors = integration.getEnvironment().chaptersSelectors;
    const first = selectors[0] ?? '';

    const mockPage = createMockPage({
      title: 'Test Series!',
      chaptersBySelector: {
        [first]: [
          { href: '/comics/test-series/chapter/2', name: 'Chapter 2' },
          { href: '/comics/test-series/chapter/1', name: 'Chapter 1' },
        ],
      },
    });

    const [title, titleErr] = await integration.titleFinder(mockPage);
    assert.equal(titleErr, null);
    assert.equal(title, 'Test Series!');

    const [chapters, chapErr] = await integration.chaptersFinder(mockPage);
    assert.equal(chapErr, null);
    assert.equal(chapters?.length, 2);
    assert.equal(chapters?.[0]?.name, 'Chapter 1');
    assert.equal(chapters?.[0]?.url, 'https://asurascans.com/comics/test-series/chapter/1');
    assert.equal(chapters?.[1]?.name, 'Chapter 2');
  });

  it('returns [null, Error] for invalid URLs in MangaFetcher without throwing', async () => {
    const [created, createErr] = MangaFetcher.create({ URL: 'not-a-valid-url' });
    assert.equal(created, null);
    assert.match(createErr?.message ?? '', /Invalid URL/);

    const fetcher = new MangaFetcher({ URL: 'not-a-valid-url' });
    const [started, startErr] = await fetcher.start();
    assert.equal(started, null);
    assert.match(startErr?.message ?? '', /Invalid URL/);
  });
});
