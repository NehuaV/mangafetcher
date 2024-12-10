import type { Chapter } from "@/lib/types";
import type { Page } from "playwright";
import type {
  Environment,
  Integration,
  IntegrationOverrides,
  IntegrationParams,
} from "../types";
import { fileURLToPath } from "url";
import path from "path";

export const createIntegration = (
  params: IntegrationParams,
  overrides?: IntegrationOverrides
): Integration => {
  const filename = fileURLToPath(import.meta.url);
  const baseURL = `https://${path.basename(filename, ".ts")}`;

  const environment: Environment = {
    pathToSeries: params.pathToSeries,
    outDir: params.outDir || "./images",

    baseURL: baseURL,
    scopeSelector: "//html/body/div[3]/div/div/div/div[5]",
    titleSelectors: [
      "//html/body/div[3]/div/div/div/div[1]/div/div[1]/div[1]/div[2]/div[1]/div[2]/div[1]/span",
    ],
    chaptersSelectors: [
      "//html/body/div[3]/div/div/div/div[1]/div/div[1]/div[2]/div[3]/div[2]",
    ],
    ...overrides?.environment,
  };

  const integration: Integration = {
    environment,
    type: "asuracomic.net",
    titleFinder: async (page: Page) => {
      const xpaths = environment.titleSelectors;

      for (const xpath of xpaths) {
        const headingText = await page
          .locator(xpath)
          .innerText()
          .catch(() => null);

        if (headingText) {
          page.setDefaultTimeout(30_000);
          return `${headingText}`;
        }
      }

      return "";
    },
    chaptersFinder: async (page: Page) => {
      const xpaths = environment.chaptersSelectors;

      const chapters: Chapter[] = [];

      for (const xpath of xpaths) {
        // Get all child elements from the chapter list container
        const listofChapterElements = await page.locator(`${xpath}/*`).count();

        for (let i = 0; i < listofChapterElements; i++) {
          // Get all elements in reverse order
          const element = page
            .locator(`${xpath}/*`)
            .nth(listofChapterElements - i - 1);

          // Get Inner a tag and its href attribute
          const aTag = element.locator("a");
          const urlPathName = await aTag.getAttribute("href");
          const name = await aTag.innerText();

          const url = `${integration.environment.baseURL}/series/${urlPathName}`;

          chapters.push({
            url: url || "",
            index: i,
            name: name || `Chapter ${i + 1} ()`,
          });
        }
      }

      return chapters;
    },

    ...overrides?.integration,
  };

  return integration;
};
