import { main } from './app.ts';
import type { BaseIntegration } from './integrations/base.ts';
import { createIntegration } from './integrations/index.ts';
import type { IntegrationParams } from './integrations/types.ts';
import { err, ok, type Result, toError } from './types.ts';

export class MangaFetcher {
  private readonly params: IntegrationParams;
  private integration: BaseIntegration | null = null;

  constructor(params: IntegrationParams) {
    this.params = params;
  }

  static create(params: IntegrationParams): Result<MangaFetcher> {
    try {
      new URL(params.URL);
    } catch (error) {
      return err(new Error(`Invalid URL "${String(params.URL)}": ${toError(error).message}`));
    }
    return ok(new MangaFetcher(params));
  }

  async start(): Promise<Result<void>> {
    let hostname: string;
    try {
      hostname = new URL(this.params.URL).hostname;
    } catch (error) {
      return err(new Error(`Invalid URL "${String(this.params.URL)}": ${toError(error).message}`));
    }

    const [integration, integrationError] = await createIntegration(hostname, this.params);
    if (integrationError) {
      return err(integrationError);
    }

    this.integration = integration;
    return main(this.integration);
  }
}
