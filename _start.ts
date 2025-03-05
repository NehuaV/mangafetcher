import { MangaFetcher } from './src/index';

try {
  const integration = new MangaFetcher({
    URL: 'https://asuracomic.net/series/the-return-of-the-crazy-demon-02189dcc',
    outDir: './images',
    sharp: {
      format: 'png',
      options: {
        quality: 90,
        compressionLevel: 9,
        effort: 10,
      },
    },
    chapterRange: [1, 2],
  });

  await integration.start();
} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
} finally {
  process.exit(0);
}
