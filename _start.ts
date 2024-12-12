import { main } from "./src/app";
import { IntegrationFactory } from "./src/integrations";

try {
  const integration = await IntegrationFactory("reaper-scans.com")({
    pathToSeries: "/series/return-of-the-mad/",
    outDir: "./images",
    chapterRange: [1, 2],
  });

  await main(integration);
} catch (error) {
  console.error("Fatal error:", error);
  process.exit(1);
} finally {
  process.exit(0);
}
