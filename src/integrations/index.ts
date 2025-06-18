import type { BaseIntegration } from './base';
import type { Environment, IntegrationParams } from './types';

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
  pathToSeries: '',
  scopeSelector: '',
  titleSelectors: [],
  chaptersSelectors: [],
};

type IntegrationClass = new (params: IntegrationParams) => BaseIntegration;

export const IntegrationFactory = async (hostname: string) => {
  return async (params: IntegrationParams): Promise<BaseIntegration> => {
    try {
      const module = await import(`./implementations/${hostname}.ts`);
      const IntegrationClass = module.default as IntegrationClass;

      if (!IntegrationClass) {
        throw new Error(`Integration class not found for ${hostname}`);
      }

      return new IntegrationClass(params);
    } catch (error) {
      throw new Error(`Integration "${hostname}" not found: ${error}`);
    }
  };
};
