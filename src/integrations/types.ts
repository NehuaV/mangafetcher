import type { AvifOptions, JpegOptions, PngOptions, WebpOptions } from 'sharp';
import type { BaseIntegration } from './base';

type FormatConfig<T, Format> = {
  format: Format;
  options: T;
};

export type SharpConfig =
  | FormatConfig<WebpOptions, 'webp'>
  | FormatConfig<JpegOptions, 'jpeg'>
  | FormatConfig<PngOptions, 'png'>
  | FormatConfig<AvifOptions, 'avif'>;

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
  /**
   * The path to the series.
   *
   * @example
   * /series/dungeon-reset
   */
  pathToSeries: string;
  /**
   * The selector to the scope of the manga images.
   *
   * @example
   * //html/body/div/div[2]/div[1]/div/div/article/div[2]
   */
  scopeSelector: string;
  /**
   * The selectors to the title of the manga.
   *
   * @example
   * ["//html/body/div/div[2]/div[1]/div/div/article/div[2]"]
   */
  titleSelectors: string[];
  /**
   * The selectors to the chapters of the manga.
   *
   * @example
   * ["//html/body/div/div[2]/div[1]/div/div/article/div[2]"]
   */
  chaptersSelectors: string[];
};
