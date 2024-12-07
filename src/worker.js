const { parentPort } = require("worker_threads");
const sharp = require("sharp");
const { basename } = require("path");

if (!parentPort) {
  throw new Error("parentPort is not available");
}

parentPort.on("message", async ({ url, directory }) => {
  try {
    const filename = basename(url.split("?")[0]);
    const filePath = `${directory}/${filename}`;

    const response = await fetch(url);
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

    parentPort.postMessage({ success: true, filename });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  } finally {
    parentPort.close();
  }
});
