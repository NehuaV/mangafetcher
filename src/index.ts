import { main } from './app';
import { IntegrationFactory } from './integrations';
import type { BaseIntegration } from './integrations/base';
import type { IntegrationParams } from './integrations/types';

export class MangaFetcher {
  private readonly hostname: string;
  private readonly params: IntegrationParams;

  private integration: BaseIntegration | null = null;

  constructor(params: IntegrationParams) {
    const hostname = new URL(params.URL).hostname;
    this.hostname = hostname;
    this.params = params;
  }

  async start() {
    const factory = await IntegrationFactory(this.hostname);
    this.integration = await factory(this.params);
    await main(this.integration);
  }
}
