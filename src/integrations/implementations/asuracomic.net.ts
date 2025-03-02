import type { Chapter } from "@/lib/types";
import type { Page } from "playwright";
import type { IntegrationParams } from "../types";
import { BaseIntegration } from "../base";
import { defaultEnvironment } from "..";

export class AsuracomicNet extends BaseIntegration {
  getIntegrationType(): string {
    return "asuracomic.net";
  }

  createEnvironment(params: IntegrationParams, url: URL) {
    return {
      ...defaultEnvironment,
      pathToSeries: url.pathname,
      outDir: params.outDir,
      sharp: params.sharp || defaultEnvironment.sharp,
      chapterRange: params.chapterRange,

      baseURL: url.origin,
      scopeSelector: "//html/body/div[4]/div/div/div/div[5]/div[2]",
      titleSelectors: [
        "//html/body/div[3]/div/div/div/div[1]/div/div[1]/div[1]/div[2]/div[2]/div[2]/div[1]/span",
        "//html/body/div[4]/div/div/div/div[1]/div/div[1]/div[1]/div[2]/div[1]/div[2]/div[1]/span",
      ],
      chaptersSelectors: [
        "//html/body/div[3]/div/div/div/div[1]/div/div[1]/div[2]/div[3]/div[2]",
        "//html/body/div[4]/div/div/div/div[1]/div/div[1]/div[2]/div[3]/div[2]",
      ],
    };
  }

  async titleFinder(page: Page): Promise<string> {
    const xpaths = this.environment.titleSelectors;

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
  }

  async chaptersFinder(page: Page): Promise<Chapter[]> {
    const xpaths = this.environment.chaptersSelectors;

    const chapters: Chapter[] = [];

    for (const xpath of xpaths) {
      // Get all child elements from the chapter list container
      const listofChapterElements = await page.locator(`${xpath}/*`).count();

      for (let i = 0; i < listofChapterElements; i++) {
        // Get all elements in reverse order
        const element = page.locator(`${xpath}/*`).nth(listofChapterElements - i - 1);

        // Get Inner a tag and its href attribute
        const aTag = element.locator("a");
        const urlPathName = await aTag.getAttribute("href");
        const name = await aTag.locator("h3").nth(0).innerText();

        const url = `${this.environment.baseURL}/series/${urlPathName}`;

        chapters.push({
          url: url || "",
          index: i,
          name: name || `Chapter ${i + 1} ()`,
        });
      }
    }

    return chapters;
  }
}
