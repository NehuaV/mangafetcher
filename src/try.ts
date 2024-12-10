import { main } from "./app";
import { IntegrationFactory } from "./integrations";

try {
  const integration = await IntegrationFactory("asuracomic.net")({
    pathToSeries: "/series/light-of-arad-forerunner-89592507",
    outDir: "./images",
    chapterRange: [1, 25],
  });

  await main(integration);
} catch (error) {
  console.error("Fatal error:", error);
  process.exit(1);
} finally {
  process.exit(0);
}
