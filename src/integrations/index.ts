import type { BaseIntegration } from './base';
import type { IntegrationType } from './integration';
import { getIntegrationClass } from './registry';
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

export const IntegrationFactory =
  (type: IntegrationType) =>
  (params: IntegrationParams): BaseIntegration => {
    const IntegrationClass = getIntegrationClass(type);

    return new IntegrationClass(params);
  };
