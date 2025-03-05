import { main } from "./app";
import { IntegrationFactory } from "./integrations";
import type { IntegrationParams } from "./integrations/types";
import type { BaseIntegration } from "./integrations/base";
import { isIntegration } from "./utils";

export class MangaFetcher {
  private integrationFactory: (params: IntegrationParams) => BaseIntegration;
  private integration: BaseIntegration;

  constructor(params: IntegrationParams) {
    const hostname = new URL(params.URL).hostname;

    if (!isIntegration(hostname)) {
      throw new Error(`Integration "${hostname}" not found`);
    }

    this.integrationFactory = IntegrationFactory(hostname);
    this.integration = this.integrationFactory(params);
  }

  async start() {
    await main(this.integration);
  }
}
