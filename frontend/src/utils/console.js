/**
 * Console utility for production environment
 * Disables console.log in production while keeping console.error and console.warn
 */

const isProduction = process.env.NODE_ENV === "production";

// Store original console methods
const originalConsole = {
  log: console.log,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

/**
 * Initialize console configuration
 * In production: disable log, debug, info
 * Keep: warn, error for debugging critical issues
 */
export const initConsole = () => {
  if (isProduction) {
    // Disable non-critical console methods in production
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};

    // Keep warn and error for critical issues
    // console.warn and console.error remain unchanged

    // Optional: Add production error tracking here
    // console.error = (...args) => {
    //   originalConsole.error(...args);
    //   // Send to error tracking service (e.g., Sentry)
    // };
  }
};

/**
 * Restore original console methods (useful for testing)
 */
export const restoreConsole = () => {
  console.log = originalConsole.log;
  console.debug = originalConsole.debug;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
};

const consoleUtils = {
  initConsole,
  restoreConsole,
};

export default consoleUtils;
