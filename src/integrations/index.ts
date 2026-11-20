import { err, ok, type Result, tryCatch } from '../types.ts';
import type { BaseIntegration } from './base.ts';
import type { IntegrationType } from './integration.d.ts';
import type { Environment, IntegrationParams } from './types.ts';

export type { IntegrationType };

export const defaultEnvironment: Environment = {
  outDir: './images',
  baseURL: '',
  sharp: {
    format: 'webp',
    options: {
      effort: 6,
      quality: 80,
      lossless: false,
    },
  },
  chapterRange: [1, 100],
  concurrency: 4,
  pathToSeries: '',
  scopeSelector: '',
  titleSelectors: [],
  chaptersSelectors: [],
};

type IntegrationClass = new (params: IntegrationParams) => BaseIntegration;

export async function createIntegration(hostname: IntegrationType | string, params: IntegrationParams): Promise<Result<BaseIntegration>> {
  if (!hostname || hostname.includes('/') || hostname.includes('..')) {
    return err(new Error(`Invalid integration hostname: "${hostname}"`));
  }

  const [module, importError] = await tryCatch(() => import(`./implementations/${hostname}.ts`));
  if (importError) {
    return err(new Error(`Integration "${hostname}" not found: ${importError.message}`));
  }

  const IntegrationClass = module.default as IntegrationClass | undefined;
  if (!IntegrationClass) {
    return err(new Error(`Integration class not found for "${hostname}"`));
  }

  const instance = new IntegrationClass(params);
  const [, initError] = instance.init();
  if (initError) {
    return err(initError);
  }

  return ok(instance);
}
