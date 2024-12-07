import type { Chapter } from "@/lib/types";
import type { Page } from "playwright";

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
    baseURL: "https://asuracomic.net",
    pathToSeries: "",
    scopeSelector: "",
    titleSelectors: [],
    chaptersSelectors: [],
  };
  return { ...defaultEnvironment, ...environment };
}

// TODO: Make a typed union of all drivers
export type Integration = {
  environment: Environment;
  type: "asuracomic" | "mangakakalot";
  titleFinder: (page: Page) => Promise<string>;
  chaptersFinder: (page: Page) => Promise<Chapter[]>;
};

export function CreateIntegration(
  environment: Environment,
  integration: Partial<Integration>
) {
  const defaultIntegration: Integration = {
    environment,
    type: "asuracomic",
    titleFinder: async (page: Page) => "",
    chaptersFinder: async (page: Page) => [],
  };
  return { ...defaultIntegration, ...integration };
}
