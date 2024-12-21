import type { Page } from "playwright";
import type { IntegrationType } from "./integration";
import type { Chapter } from "@/lib/types";
import type { AvifOptions, JpegOptions, PngOptions, WebpOptions } from "sharp";

type FormatConfig<T, Format> = {
  format: Format;
  options: T;
};

export type SharpConfig =
  | FormatConfig<WebpOptions, "webp">
  | FormatConfig<JpegOptions, "jpeg">
  | FormatConfig<PngOptions, "png">
  | FormatConfig<AvifOptions, "avif">;

export type IntegrationParams = {
  outDir: string;
  chapterRange: [number, number];
  URL: string | URL;
  sharp?: SharpConfig;
};

export type Integration = {
  environment: Environment;
  type: IntegrationType | "";
  titleFinder: (page: Page) => Promise<string>;
  chaptersFinder: (page: Page) => Promise<Chapter[]>;
};

export type Environment = {
  outDir: string;
  baseURL: string;
  sharp: SharpConfig;
  chapterRange: [number, number];
  pathToSeries: string;
  scopeSelector: string;
  titleSelectors: string[];
  chaptersSelectors: string[];
};
