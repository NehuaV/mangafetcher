import type { Page } from "playwright";
import type { IntegrationType } from "./integration";
import type { Chapter } from "@/lib/types";

export type IntegrationParams = {
  pathToSeries: string;
  outDir: string;
};

export type IntegrationOverrides = {
  environment?: Partial<Environment>;
  integration?: Partial<Integration>;
};

export type Integration = {
  environment: Environment;
  type: IntegrationType;
  titleFinder: (page: Page) => Promise<string>;
  chaptersFinder: (page: Page) => Promise<Chapter[]>;
};

export type Environment = {
  outDir: string;
  baseURL: string;
  pathToSeries: string;
  scopeSelector: string;
  titleSelectors: string[];
  chaptersSelectors: string[];
};
