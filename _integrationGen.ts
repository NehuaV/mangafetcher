import { write } from "bun";
import { readdir } from "fs/promises";

const driverFiles = await readdir("./src/drivers/implementations");
driverFiles.push("");
const driverTypes = driverFiles
  .map((file) => file.split(".")[0])
  .map((type) => `"${type}"`)
  .join(" | ");

const driverTypesFile = `export type DriverType = ${driverTypes};\n`;

await write("./src/integrations/integration.d.ts", driverTypesFile);
