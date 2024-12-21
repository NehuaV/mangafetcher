import { main } from "./app";
import { IntegrationFactory } from "./integrations";
import type { IntegrationType } from "./integrations/integration";
import type { Integration, IntegrationParams } from "./integrations/types";

export class MangaFetcher {
  private integrationFactory: (params: IntegrationParams) => Integration;
  private integration: Integration | null;

  constructor(type: IntegrationType) {
    this.integrationFactory = IntegrationFactory(type);
    this.integration = null;
  }

  fetch(params: IntegrationParams) {
    this.integration = this.integrationFactory(params);
    return this;
  }

  async start() {
    if (!this.integration) {
      throw new Error("Integration not found");
    }
    await main(this.integration);
  }
}
