# Manga Fetcher

A tool for automatically downloading manga chapters from various online sources using Node.js native TypeScript execution.

## Features

- Download manga chapters from popular websites (currently supports `asuracomic.net` and `reaper-scans.com`)
- Organize downloads by sanitized series and chapter names
- Configurable image quality and format (`webp`, `jpeg`, `png`, `avif`)
- Chapter range selection
- Resumable chapter and page downloads
- Ad-blocking with local filter caching
- Go-style `[result, error]` error handling and bounded download concurrency

## Requirements

- Node.js v26 or higher (with native strippable TypeScript support)

## Installation

```bash
npm install
```

## Usage

### CLI

```bash
npm start -- --url https://asuracomic.net/series/your-manga-series --chapters 1-10 --format webp --out ./images
```

| Flag               | Description                                  | Default                               |
| ------------------ | -------------------------------------------- | ------------------------------------- |
| `--url`, `-u`      | URL of the manga series                      | Required (or fallback in `_start.ts`) |
| `--out`, `-o`      | Output directory                             | `./images`                            |
| `--chapters`, `-c` | Chapter range (`start-end`)                  | `1-100`                               |
| `--format`, `-f`   | Image format (`webp`, `jpeg`, `png`, `avif`) | `webp`                                |
| `--quality`, `-q`  | Image quality (`1-100`)                      | `80`                                  |

### Programmatic Usage

```typescript
import { MangaFetcher } from './src/index.ts';

const fetcher = new MangaFetcher({
  URL: 'https://asuracomic.net/series/your-manga-series',
  outDir: './images',
  sharp: {
    format: 'webp',
    options: {
      quality: 80,
      effort: 6,
    },
  },
  chapterRange: [1, 10],
});

const [, error] = await fetcher.start();
if (error) {
  console.error('Fatal error:', error);
  process.exit(1);
}
```

## Development

- `npm run check` — Run Biome linter and formatter
- `npm run typecheck` — Run TypeScript type check (`erasableSyntaxOnly`)
- `npm test` — Run unit and fixture tests with `node --test`
- `npm run generate-integration-types` — Regenerate `src/integrations/integration.d.ts`

## Adding New Sources

Create a new implementation file in `src/integrations/implementations/` extending `BaseIntegration` and run `npm run generate-integration-types`.
