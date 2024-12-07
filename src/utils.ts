import { stat, mkdir } from "fs/promises";
import { Worker } from "worker_threads";
import path from "path";
import type { Chapter } from "./lib/types";

export async function upsertDir(dir: string) {
  try {
    await stat(dir);
  } catch {
    await mkdir(dir, { recursive: true });
  }
}

export function createImageDownloadWorker(
  chapter: Chapter,
  directory: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "worker.ts"));

    worker.on("message", (message) => {
      if (message.success) {
        resolve(message.filename);
      } else {
        reject(new Error(message.error));
      }
    });

    worker.on("error", reject);
    worker.postMessage({ chapter, directory });
  });
}
