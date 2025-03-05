import type { IntegrationType } from "./integration";
import type { IntegrationParams } from "./types";
import type { BaseIntegration } from "./base";

import { AsuracomicNet } from "./implementations/asuracomic.net";
import { ReaperScansCom } from "./implementations/reaper-scans.com";

type IntegrationConstructor = new (params: IntegrationParams) => BaseIntegration;
type IntegrationRegistry = Record<IntegrationType, IntegrationConstructor>;

export const integrationRegistry: IntegrationRegistry = {
  "asuracomic.net": AsuracomicNet,
  "reaper-scans.com": ReaperScansCom,
};

export const getIntegrationClass = (type: IntegrationType): IntegrationConstructor => {
  const IntegrationClass = integrationRegistry[type];

  return IntegrationClass;
};
