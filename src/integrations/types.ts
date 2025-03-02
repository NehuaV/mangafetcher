import type { AvifOptions, JpegOptions, PngOptions, WebpOptions } from "sharp";
import type { BaseIntegration } from "./base";

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

export type Integration = BaseIntegration;

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
