import { write } from "bun";
import { readdir } from "fs/promises";

const integrationFiles = await readdir("./src/integrations/implementations");
integrationFiles.push("");
const integrationTypes = integrationFiles
  .map((file) => file.split(".")[0])
  .map((type) => `"${type}"`)
  .join(" | ");

const integrationTypesFile = `export type IntegrationType = ${integrationTypes};\n`;

await write("./src/integrations/integration.d.ts", integrationTypesFile);
