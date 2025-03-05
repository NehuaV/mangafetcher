import type { Page } from "playwright";
import type { Chapter } from "@/types";
import type { Environment, IntegrationParams, SharpConfig } from "./types";

export abstract class BaseIntegration {
  protected environment: Environment;
  readonly type: string;

  constructor(params: IntegrationParams) {
    const url = new URL(params.URL);

    if (!url.hostname || !url.pathname) {
      throw new Error("URL must be a valid URL");
    }

    this.type = this.getIntegrationType();

    if (this.type !== url.hostname) {
      throw new Error("Integration type does not match URL hostname");
    }

    this.environment = this.createEnvironment(params, url);
  }

  getEnvironment(): Environment {
    return this.environment;
  }

  abstract chaptersFinder(page: Page): Promise<Chapter[]>;
  abstract createEnvironment(params: IntegrationParams, url: URL): Environment;
  abstract getIntegrationType(): string;
  abstract titleFinder(page: Page): Promise<string>;
}
