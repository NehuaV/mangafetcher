import { readdir, writeFile } from 'node:fs/promises';

const integrationFiles = await readdir('./src/integrations/implementations');

const integrationTypes = integrationFiles
  .filter((file) => file.endsWith('.ts') && file !== 'base.ts')
  .map((file) => file.slice(0, -3))
  .sort()
  .map((type) => `'${type}'`)
  .join(' | ');

const integrationTypesFile = `export type IntegrationType = ${integrationTypes};\n`;

await writeFile('./src/integrations/integration.d.ts', integrationTypesFile);
