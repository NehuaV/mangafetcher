import { parentPort } from "worker_threads";
import sharp from "sharp";
import type { Chapter } from "./lib/types";

if (!parentPort) {
  throw new Error("parentPort is not available");
}

type Message = {
  chapter: Chapter;
  directory: string;
};

parentPort.on("message", async ({ chapter, directory }: Message) => {
  try {
    const filename = `${chapter.name}.webp`;
    const filePath = `${directory}/${filename}`;

    const response = await fetch(chapter.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    await sharp(arrayBuffer)
      .webp({
        quality: 80,
        effort: 6,
      })
      .toFile(filePath);

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
});
