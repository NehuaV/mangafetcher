import type { Chapter } from "@/lib/types";
import type { Page } from "playwright";
import type { IntegrationType } from "./integration";

export type Environment = {
  outDir: string;
  baseURL: string;
  pathToSeries: string;
  scopeSelector: string;
  titleSelectors: string[];
  chaptersSelectors: string[];
};

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

export type Integration = {
  environment: Environment;
  type: IntegrationType;
  titleFinder: (page: Page) => Promise<string>;
  chaptersFinder: (page: Page) => Promise<Chapter[]>;
};

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
  async (overrides: {
    environment: Partial<Environment> & { pathToSeries: string };
    integration: Partial<Integration>;
  }): Promise<Integration> => {
    const implementationPath = `./implementations/${type}`;

    try {
      const { createIntegration } = await import(implementationPath);
      const integration: Integration = createIntegration(overrides || {});
      return integration;
    } catch (error) {
      throw new Error(
        `Failed to load integration implementation for type "${type}": ${(error as Error).message}`
      );
    }
  };
