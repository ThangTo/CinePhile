// ============================================================================
// MSW Handlers - Main Export
// ============================================================================

import { movieHandlers } from "./movieHandlers";
import { authHandlers } from "./authHandlers";
import { userHandlers } from "./userHandlers";
import { adminHandlers } from "./adminHandlers";
import { healthHandlers } from "./healthHandlers";

/**
 * Export all MSW handlers combined
 * This is the main entry point for MSW handlers
 */
export const handlers = [
  ...movieHandlers,
  ...authHandlers,
  ...userHandlers,
  ...adminHandlers,
  ...healthHandlers,
];

// Also export individual handler groups for flexibility
export { movieHandlers, authHandlers, userHandlers, adminHandlers, healthHandlers };
