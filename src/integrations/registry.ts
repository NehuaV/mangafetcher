import type { IntegrationType } from "./integration";
import type { IntegrationParams } from "./types";
import type { BaseIntegration } from "./base";

import { AsuracomicNet } from "./implementations/asuracomic.net";
import { ReaperScansCom } from "./implementations/reaper-scans.com";

type IntegrationConstructor = new (params: IntegrationParams) => BaseIntegration;

const integrationRegistry: Record<IntegrationType, IntegrationConstructor> = {
  "asuracomic.net": AsuracomicNet,
  "reaper-scans.com": ReaperScansCom,
};

export const getIntegrationClass = (type: IntegrationType): IntegrationConstructor => {
  const IntegrationClass = integrationRegistry[type];

  if (!IntegrationClass) {
    throw new Error(`Integration "${type}" not found`);
  }

  return IntegrationClass;
};
