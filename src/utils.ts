import { stat, mkdir } from "fs/promises";
import { Worker } from "worker_threads";
import path from "path";
export async function ensureDirExists(dir: string) {
  try {
    await stat(dir);
  } catch {
    await mkdir(dir, { recursive: true });
  }
}

export function createImageDownloadWorker(
  url: string,
  directory: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "worker.js"));

    worker.on("message", (message) => {
      if (message.success) {
        resolve(message.filename);
      } else {
        reject(new Error(message.error));
      }
    });

    worker.on("error", reject);
    worker.postMessage({ url, directory });
  });
}
