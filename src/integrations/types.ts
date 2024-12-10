import type { Page } from "playwright";
import type { IntegrationType } from "./integration";
import type { Chapter } from "@/lib/types";

export type FileType = "jpeg" | "png" | "webp" | "avif";

export type IntegrationParams = {
  pathToSeries: string;
  outDir: string;
  chapterRange: [number, number];

  file?: {
    fileType?: FileType;
    fileCompressionLevel?: number;
  };
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
  fileType: FileType;
  fileCompressionLevel: number;
  chapterRange: [number, number];

  pathToSeries: string;
  scopeSelector: string;
  titleSelectors: string[];
  chaptersSelectors: string[];
};
