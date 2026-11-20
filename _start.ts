import { parseArgs } from 'node:util';
import { MangaFetcher } from './src/index.ts';
import type { SharpConfig } from './src/integrations/types.ts';

function parseChapterRange(raw: string | undefined): [number, number] {
  if (!raw) {
    return [1, 2];
  }
  const parts = raw.split('-').map((value) => Number.parseInt(value.trim(), 10));
  if (parts.length !== 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) {
    throw new Error(`Invalid --chapters value "${raw}". Expected format: start-end (e.g. 1-10).`);
  }
  return [parts[0], parts[1]];
}

function buildSharpConfig(formatRaw: string | undefined, qualityRaw: string | undefined): SharpConfig {
  const quality = qualityRaw ? Number.parseInt(qualityRaw, 10) : 80;
  const format = formatRaw ?? 'webp';

  switch (format) {
    case 'webp':
      return { format: 'webp', options: { quality, effort: 6 } };
    case 'jpeg':
      return { format: 'jpeg', options: { quality } };
    case 'png':
      return { format: 'png', options: { quality, compressionLevel: 9, effort: 10 } };
    case 'avif':
      return { format: 'avif', options: { quality } };
    default:
      throw new Error(`Unsupported --format "${format}". Expected: webp, jpeg, png, or avif.`);
  }
}

const { values } = parseArgs({
  options: {
    url: { type: 'string', short: 'u' },
    out: { type: 'string', short: 'o' },
    chapters: { type: 'string', short: 'c' },
    format: { type: 'string', short: 'f' },
    quality: { type: 'string', short: 'q' },
    concurrency: { type: 'string' },
  },
});

const targetUrl = values.url ?? 'https://asurascans.com/comics/the-return-of-the-crazy-demon-7ba78ec7';
const outDir = values.out ?? './images';
const chapterRange = parseChapterRange(values.chapters);
const sharp = buildSharpConfig(values.format, values.quality);
const concurrency = values.concurrency ? Number.parseInt(values.concurrency, 10) : 4;

const fetcher = new MangaFetcher({
  URL: targetUrl,
  outDir,
  sharp,
  chapterRange,
  concurrency,
});

const [, error] = await fetcher.start();
if (error) {
  console.error('Fatal error:', error);
  process.exit(1);
}
