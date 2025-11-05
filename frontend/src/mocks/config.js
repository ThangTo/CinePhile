// ============================================================================
// MSW Configuration
// ============================================================================

import { http, HttpResponse } from "msw";

/**
 * API Base URL for MSW handlers
 * Can be overridden via REACT_APP_API_URL environment variable
 */
export const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";

// Re-export MSW utilities for convenience
export { http, HttpResponse };
