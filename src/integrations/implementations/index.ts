import type { IntegrationType } from "../integration";
import type { Integration, IntegrationParams } from "../types";
import { asuracomicNet } from "./asuracomic.net";
import { reaperScansCom } from "./reaper-scans.com";

type IntegrationCreator = (params: IntegrationParams) => Integration;

const integrationRegistry: Record<IntegrationType, IntegrationCreator> = {
  "asuracomic.net": asuracomicNet,
  "reaper-scans.com": reaperScansCom,
};

export const getIntegration = (type: IntegrationType): IntegrationCreator => {
  const integration = integrationRegistry[type];
  if (!integration) {
    throw new Error(`Integration "${type}" not found`);
  }
  return integration;
};
