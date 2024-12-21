import type { Page } from "playwright";
import type { IntegrationType } from "./integration";
import type { Environment, Integration, IntegrationParams } from "./types";
import { getIntegration } from "./registry";

export const defaultEnvironment: Environment = {
  outDir: "./images",
  baseURL: "",
  sharp: {
    format: "webp",
    options: {
      effort: 6,
      quality: 80,
      lossless: false,
    },
  },
  chapterRange: [1, 100],
  pathToSeries: "",
  scopeSelector: "",
  titleSelectors: [],
  chaptersSelectors: [],
};

export const defaultIntegration: Integration = {
  environment: defaultEnvironment,
  type: "",
  titleFinder: async (page: Page) => "",
  chaptersFinder: async (page: Page) => [],
};

export const IntegrationFactory =
  (type: IntegrationType) =>
  (params: IntegrationParams): Integration => {
    const url = new URL(params.URL);

    if (!url.hostname || !url.pathname) {
      throw new Error("URL must be a valid URL");
    }

    const integration = getIntegration(type)(params);

    if (integration.type !== url.hostname) {
      throw new Error("Integration type does not match URL hostname");
    }

    return integration;
  };
