import { main } from "./app";
import { IntegrationFactory } from "./integrations";
import type { IntegrationType } from "./integrations/integration";
import type { IntegrationParams } from "./integrations/types";
import type { BaseIntegration } from "./integrations/base";

export class MangaFetcher {
  private integrationFactory: (params: IntegrationParams) => BaseIntegration;
  private integration: BaseIntegration | null;

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
