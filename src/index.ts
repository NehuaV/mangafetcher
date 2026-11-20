import { main } from './app.ts';
import type { BaseIntegration } from './integrations/base.ts';
import { createIntegration } from './integrations/index.ts';
import type { IntegrationParams } from './integrations/types.ts';
import { err, type Result } from './types.ts';

export class MangaFetcher {
  private readonly hostname: string;
  private readonly params: IntegrationParams;
  private integration: BaseIntegration | null = null;

  constructor(params: IntegrationParams) {
    const hostname = new URL(params.URL).hostname;
    this.hostname = hostname;
    this.params = params;
  }

  async start(): Promise<Result<void>> {
    const [integration, integrationError] = await createIntegration(this.hostname, this.params);
    if (integrationError) {
      return err(integrationError);
    }

    this.integration = integration;
    return main(this.integration);
  }
}
