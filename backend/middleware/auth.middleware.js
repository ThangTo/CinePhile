/**
 * Authentication Middleware
 * Verifies JWT token from Authorization header
 * Attaches user object to req.user if token is valid
 *
 * Usage:
 * router.get("/protected-route", authMiddleware, controller.function);
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authMiddleware = async (req, res, next) => {
  // TODO: Implement
  // 1. Extract token from req.headers.authorization
  // 2. Verify JWT token
  // 3. Get user from token payload
  // 4. Attach user to req.user
  // 5. Call next() if valid, return 401 if invalid
};

module.exports = authMiddleware;
