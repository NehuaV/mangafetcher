import { readdir, writeFile } from 'node:fs/promises';

const integrationFiles = await readdir('./src/integrations/implementations');

const integrationTypes = integrationFiles
  .map((file) => file.split('.').slice(0, -1).join('.'))
  .map((type) => `'${type}'`)
  .join(' | ');

const integrationTypesFile = `export type IntegrationType = ${integrationTypes};\n`;

await writeFile('./src/integrations/integration.d.ts', integrationTypesFile);
