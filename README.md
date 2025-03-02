# Manga Fetcher

A tool for automatically downloading manga chapters from various online sources.

## Features

- Download manga chapters from popular websites (currently supports asuracomic.net and reaper-scans.com)
- Organize downloads by series and chapters
- Configurable image quality and format (WebP, JPEG, PNG, AVIF)
- Chapter range selection
- Automatic chapter detection and skipping of already downloaded content
- Ad-blocking for cleaner downloads

## Requirements

- Node.js v16 or higher
- Bun runtime

## Running the app

### Install bun runtime

Official Link here: https://bun.sh/

Linux/Macos

```bash
curl -fsSL https://bun.sh/install | bash
```

Windows

```bash
powershell -c "irm bun.sh/install.ps1 | iex"
```

### To install dependencies:

```bash
bun i
```

### To run:

```bash
bun start
```

## Usage Examples

Edit the `_start.ts` file to configure your manga download:

```typescript
import { MangaFetcher } from "./src/index";

try {
  const integration = new MangaFetcher("asuracomic.net").fetch({
    URL: "https://asuracomic.net/series/your-manga-series",
    outDir: "./images",
    sharp: {
      format: "webp",
      options: {
        quality: 80,
        effort: 6,
      },
    },
    chapterRange: [1, 10], // Download chapters 1-10
  });

  await integration.start();
} catch (error) {
  console.error("Fatal error:", error);
}
```

## Supported Sites

- asuracomic.net
- reaper-scans.com

## Configuration Options

| Option        | Description                                  | Default          |
| ------------- | -------------------------------------------- | ---------------- |
| URL           | URL of the manga series                      | Required         |
| outDir        | Directory to save images                     | ./images         |
| chapterRange  | Range of chapters to download `[start, end]` | [1, 100]         |
| sharp.format  | Image format (webp, jpeg, png, avif)         | webp             |
| sharp.options | Format-specific options for image processing | Varies by format |

## Adding New Sources

To add support for a new manga source, create a new implementation file in `src/integrations/implementations/` following the pattern of existing integrations.

## License

This project is open source software.
