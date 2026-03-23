import { httpGet } from "@/services/httpClient";
import type { BootstrapResponse } from "@/types/bootstrap";

export const bootstrapService = {
  getBootstrap: async (): Promise<BootstrapResponse> => {
    return httpGet<BootstrapResponse>("/v1/bootstrap");
  }
};
