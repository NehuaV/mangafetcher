import { main } from "./app";
import { IntegrationFactory } from "./integrations";
import type { IntegrationType } from "./integrations/integration";
import type { Integration, IntegrationParams } from "./integrations/types";
export class CrawlFetcher {
  private integrationFactory: (
    params: IntegrationParams
  ) => Promise<Integration>;
  private integration: Integration | null;

  constructor(type: IntegrationType) {
    this.integrationFactory = IntegrationFactory(type);
    this.integration = null;
  }

  async fetch(params: IntegrationParams) {
    this.integration = await this.integrationFactory(params);
    return this.integration;
  }

  async start() {
    if (!this.integration) {
      throw new Error("Integration not found");
    }
    return main(this.integration);
  }
}
