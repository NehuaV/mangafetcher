import { CrawlFetcher } from "./src/index";

try {
  const integration = new CrawlFetcher("asuracomic.net").fetch({
    URL: "https://asuracomic.net/series/the-return-of-the-crazy-demon-02189dcc",
    outDir: "./images",
    sharp: {
      format: "jpeg",
      options: {
        quality: 80,
        progressive: true,
        chromaSubsampling: "4:4:4",
      },
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
