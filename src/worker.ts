import { parentPort } from "worker_threads";
import sharp from "sharp";
import type { Chapter, ChapterImage } from "./lib/types";
import type { Environment, Integration } from "./integrations";
import { upsertDir } from "./utils";

if (!parentPort) {
  throw new Error("parentPort is not available");
}

type Message = {
  chapter: ChapterImage;
  chapterDir: string;
  environment: Environment;
};

parentPort.on(
  "message",
  async ({ chapter, chapterDir, environment }: Message) => {
    let controller: AbortController | null = new AbortController();

    try {
      const filename = `${chapter.imageName}.webp`;
      const filePath = chapterDir;
      const fullPath = `${filePath}/${filename}`;
      await upsertDir(filePath);

      // Set a timeout of 10 seconds
      const timeoutId = setTimeout(() => {
        controller?.abort();
        controller = null;
      }, 10000);

      const response = await fetch(chapter.url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();

      // Add timeout for image processing
      const processTimeoutId = setTimeout(() => {
        throw new Error("Image processing timeout");
      }, 15000);

      await sharp(arrayBuffer)
        .webp({
          quality: 80,
          effort: 6,
        })
        .toFile(fullPath);

      clearTimeout(processTimeoutId);

      parentPort?.postMessage({ success: true, filename });
    } catch (error) {
      if (error instanceof Error) {
        parentPort?.postMessage({ success: false, error: error.message });
      } else {
        parentPort?.postMessage({ success: false, error: "Unknown error" });
      }
    } finally {
      controller = null;
      parentPort?.close();
    }
  }
);
