import { parentPort } from "worker_threads";
import sharp from "sharp";
import type { Chapter, ChapterImage } from "./lib/types";
import type { Environment, Integration } from "./drivers";
import { upsertDir } from "./utils";

if (!parentPort) {
  throw new Error("parentPort is not available");
}

type Message = {
  chapter: ChapterImage;
  directory: string;
  environment: Environment;
};

parentPort.on(
  "message",
  async ({ chapter, directory, environment }: Message) => {
    try {
      const filename = `${chapter.imageName}.webp`;
      const filePath = `${directory}/${chapter.name}`;
      const fullPath = `${filePath}/${filename}`;
      await upsertDir(filePath);

      const response = await fetch(chapter.url, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      await sharp(arrayBuffer)
        .webp({
          quality: 80,
          effort: 6,
        })
        .toFile(fullPath);

      parentPort?.postMessage({ success: true, filename });
    } catch (error) {
      if (error instanceof Error) {
        parentPort?.postMessage({ success: false, error: error.message });
      } else {
        parentPort?.postMessage({ success: false, error: "Unknown error" });
      }
    } finally {
      parentPort?.close();
    }
  }
);
