const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const authService = require('../services/auth.service');
const avatarService = require('../services/avatar.service');
const { attachAuthCookies } = require('../utils/authUtils');
const redisService = require('../services/redis.service');
const premiumService = require('../services/premium.service');

const isProduction = process.env.NODE_ENV === 'production';

const ensureUserAvatarReady = async (user) => {
  if (!user) {
    return user;
  }

  try {
    await avatarService.migrateStoredAvatarToR2(user);
  } catch (error) {
    if (!isProduction) {
      console.warn('Avatar migration skipped:', error.message);
    }
  }

  return user;
};

const getAccessTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return req.cookies?.accessToken || null;
};

const getUserFromAccessToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await ensureUserAvatarReady(await User.findById(decoded.userId));
  return premiumService.normalizePremiumUser(user);
};

const tryRefreshUserFromCookie = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return null;
  }

  const newTokens = await authService.refreshToken(refreshToken);
  attachAuthCookies(res, newTokens);
  return getUserFromAccessToken(newTokens.token);
};

const authMiddleware = async (req, res, next) => {
  try {
    const token = getAccessTokenFromRequest(req);

    if (!token) {
      try {
        const refreshedUser = await tryRefreshUserFromCookie(req, res);
        if (refreshedUser) {
          req.user = refreshedUser;
          return next();
        }
      } catch (refreshError) {
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        return res.status(401).json({ message: 'Unauthorized' });
      }

      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      // Check if token is blacklisted (logout)
      if (redisService.isConnected) {
        const isBlacklisted = await redisService.exists(`blacklist:${token}`);
        if (isBlacklisted) {
          return res.status(401).json({
            message: 'Token has been revoked. Please login again.',
          });
        }
      }

      const user = await getUserFromAccessToken(token);

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      req.user = user;
      return next();
    } catch (tokenError) {
      // Token expired or invalid, try to refresh
      if (tokenError.name === 'TokenExpiredError' || tokenError.name === 'JsonWebTokenError') {
        try {
          const refreshedUser = await tryRefreshUserFromCookie(req, res);
          if (refreshedUser) {
            req.user = refreshedUser;
            return next();
          }
        } catch (refreshError) {
          res.clearCookie('accessToken');
          res.clearCookie('refreshToken');
          return res.status(401).json({ message: 'Unauthorized' });
        }
      }
      throw tokenError;
    }
  } catch (error) {
    if (!isProduction) {
      console.error('Auth middleware error:', error);
    }
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Optional authentication - doesn't block if no token, just attaches user if available
const optionalAuth = async (req, res, next) => {
  try {
    const token = getAccessTokenFromRequest(req);

    if (!token) {
      try {
        const refreshedUser = await tryRefreshUserFromCookie(req, res);
        req.user = refreshedUser || null;
        return next();
      } catch (_refreshError) {
        req.user = null;
        return next();
      }
    }

    try {
      // Check if token is blacklisted (logout)
      if (redisService.isConnected) {
        const isBlacklisted = await redisService.exists(`blacklist:${token}`);
        if (isBlacklisted) {
          // Token is blacklisted, don't set user
          req.user = null;
          return next();
        }
      }

      const user = await getUserFromAccessToken(token);

      if (user) {
        req.user = user;
      } else {
        req.user = null;
      }
    } catch (tokenError) {
      if (tokenError.name === 'TokenExpiredError' || tokenError.name === 'JsonWebTokenError') {
        try {
          const refreshedUser = await tryRefreshUserFromCookie(req, res);
          req.user = refreshedUser || null;
          return next();
        } catch (_refreshError) {
          req.user = null;
          return next();
        }
      }

      req.user = null;
    }

    return next();
  } catch (error) {
    // Any error, just continue without user
    req.user = null;
    return next();
  }
};

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuth;
