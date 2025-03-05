import { main } from './app';
import { IntegrationFactory } from './integrations';
import type { BaseIntegration } from './integrations/base';
import type { IntegrationParams } from './integrations/types';
import { isIntegration } from './utils';

export class MangaFetcher {
  private integration: BaseIntegration;

  constructor(params: IntegrationParams) {
    const hostname = new URL(params.URL).hostname;

    if (!isIntegration(hostname)) {
      throw new Error(`Integration "${hostname}" not found`);
    }

    this.integration = IntegrationFactory(hostname)(params);
  }

  async start() {
    await main(this.integration);
  }
}
