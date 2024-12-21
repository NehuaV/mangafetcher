import { CrawlFetcher } from "./src/index";

try {
  const integration = new CrawlFetcher("asuracomic.net").fetch({
    URL: "https://asuracomic.net/series/the-return-of-the-crazy-demon-02189dcc",
    outDir: "./images",
    file: {
      fileType: "jpeg",
      fileEffort: 6,
      fileCompressionLevel: 9,
    },
    chapterRange: [1, 2],
  });

  await integration.start();
} catch (error) {
  console.error("Fatal error:", error);
  process.exit(1);
} finally {
  process.exit(0);
}
