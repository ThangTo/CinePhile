// ============================================================================
// Health Handlers
// ============================================================================

import { http, HttpResponse, API_BASE } from "mocks/config";

export const healthHandlers = [
  http.get(`${API_BASE}/health`, async () => {
    return HttpResponse.json({ status: "ok", message: "API is running" });
  }),
];
