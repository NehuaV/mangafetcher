# Manga Fetcher

A tool for automatically downloading manga chapters from various online sources using Node.js native TypeScript execution.

## Features

- Download manga chapters from supported websites (`asurascans.com` and `reaper-scans.com`)
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

This installs dependencies, generates `src/integrations/integration.d.ts` (`prepare`), and installs Playwright's Firefox browser (`postinstall`).

## Usage

### CLI

```bash
npm start -- --url https://asurascans.com/comics/your-manga-series --chapters 1-10 --format webp --out ./images
```

| Flag               | Description                                  | Default                               |
| ------------------ | -------------------------------------------- | ------------------------------------- |
| `--url`, `-u`      | URL of the manga series                      | Required (or fallback in `_start.ts`) |
| `--out`, `-o`      | Output directory                             | `./images`                            |
| `--chapters`, `-c` | Chapter range (`start-end`)                  | `1-2`                                 |
| `--format`, `-f`   | Image format (`webp`, `jpeg`, `png`, `avif`) | `webp`                                |
| `--quality`, `-q`  | Image quality (`1-100`)                      | `80`                                  |
| `--concurrency`    | Maximum concurrent image downloads           | `4`                                   |

### Programmatic Usage

```typescript
import { MangaFetcher } from './src/index.ts';

const [fetcher, createError] = MangaFetcher.create({
  URL: 'https://asurascans.com/comics/your-manga-series',
  outDir: './images',
  sharp: {
    format: 'webp',
    options: {
      quality: 80,
      effort: 6,
    },
  },
  chapterRange: [1, 10],
  concurrency: 4,
});
if (createError) {
  console.error('Fatal error:', createError);
  process.exit(1);
}

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

Create a new `<hostname>.ts` file in `src/integrations/implementations/` extending `BaseIntegration`, then run `npm run generate-integration-types`.
