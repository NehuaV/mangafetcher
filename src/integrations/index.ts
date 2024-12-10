import type { Chapter } from "@/lib/types";
import type { Page } from "playwright";
import type { IntegrationType } from "./integration";
import type {
  Environment,
  Integration,
  IntegrationOverrides,
  IntegrationParams,
} from "./types";

export function CreateEnvironment(environment: Partial<Environment>) {
  const defaultEnvironment: Environment = {
    outDir: "./images",
    baseURL: "",
    pathToSeries: "",
    scopeSelector: "",
    titleSelectors: [],
    chaptersSelectors: [],
  };
  return { ...defaultEnvironment, ...environment };
}

export function CreateIntegration(
  environment: Environment,
  integration: Partial<Integration>
) {
  const defaultIntegration: Integration = {
    environment,
    type: "",
    titleFinder: async (page: Page) => "",
    chaptersFinder: async (page: Page) => [],
  };
  return { ...defaultIntegration, ...integration };
}

export const IntegrationFactory =
  (type: IntegrationType) =>
  async (
    params: IntegrationParams,
    overrides?: IntegrationOverrides
  ): Promise<Integration> => {
    const implementationPath = `./implementations/${type}`;

    try {
      const { createIntegration } = await import(implementationPath);
      const integration: Integration = createIntegration(params, overrides);
      return integration;
    } catch (error) {
      throw new Error(
        `Failed to load integration implementation for type "${type}": ${(error as Error).message}`
      );
    }
  };
