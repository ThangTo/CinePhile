const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const authService = require('../services/auth.service');
const avatarService = require('../services/avatar.service');
const { attachAuthCookies } = require('../utils/authUtils');
const redisService = require('../services/redis.service');

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

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      token = req.cookies?.accessToken || null;
    }

    if (!token) {
      // Try to refresh token if refresh token exists
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        try {
          const newTokens = await authService.refreshToken(refreshToken);
          attachAuthCookies(res, newTokens);
          // Verify new token and get user
          const decoded = jwt.verify(newTokens.token, process.env.JWT_SECRET);
          const user = await ensureUserAvatarReady(await User.findById(decoded.userId));
          if (user) {
            // Check if premium subscription has expired and downgrade if needed
            if (user.role === 'premium' && user.premiumExpiresAt) {
              const now = new Date();
              const expiresAt = new Date(user.premiumExpiresAt);
              if (expiresAt <= now) {
                user.role = 'user';
                user.premiumPlan = null;
                user.premiumExpiresAt = null;
                await user.save();
              }
            }
            req.user = user;
            return next();
          }
        } catch (refreshError) {
          // Refresh token is invalid, clear cookies and return unauthorized
          res.clearCookie('accessToken');
          res.clearCookie('refreshToken');
          return res.status(401).json({ message: 'Unauthorized' });
        }
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

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await ensureUserAvatarReady(await User.findById(decoded.userId));

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Check if premium subscription has expired and downgrade if needed
      if (user.role === 'premium' && user.premiumExpiresAt) {
        const now = new Date();
        const expiresAt = new Date(user.premiumExpiresAt);
        if (expiresAt <= now) {
          user.role = 'user';
          user.premiumPlan = null;
          user.premiumExpiresAt = null;
          await user.save();
        }
      }

      req.user = user;
      return next();
    } catch (tokenError) {
      // Token expired or invalid, try to refresh
      if (tokenError.name === 'TokenExpiredError' || tokenError.name === 'JsonWebTokenError') {
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
          try {
            const newTokens = await authService.refreshToken(refreshToken);
            attachAuthCookies(res, newTokens);
            // Verify new token and get user
            const decoded = jwt.verify(newTokens.token, process.env.JWT_SECRET);
            const user = await ensureUserAvatarReady(await User.findById(decoded.userId));
            if (user) {
              // Check if premium subscription has expired and downgrade if needed
              if (user.role === 'premium' && user.premiumExpiresAt) {
                const now = new Date();
                const expiresAt = new Date(user.premiumExpiresAt);
                if (expiresAt <= now) {
                  user.role = 'user';
                  user.premiumPlan = null;
                  user.premiumExpiresAt = null;
                  await user.save();
                }
              }
              req.user = user;
              return next();
            }
          } catch (refreshError) {
            // Refresh token is invalid, clear cookies and return unauthorized
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            return res.status(401).json({ message: 'Unauthorized' });
          }
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
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      token = req.cookies?.accessToken || null;
    }

    if (!token) {
      // No token, continue without user
      req.user = null;
      return next();
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

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await ensureUserAvatarReady(await User.findById(decoded.userId));

      if (user) {
        // Check if premium subscription has expired and downgrade if needed
        if (user.role === 'premium' && user.premiumExpiresAt) {
          const now = new Date();
          const expiresAt = new Date(user.premiumExpiresAt);
          if (expiresAt <= now) {
            user.role = 'user';
            user.premiumPlan = null;
            user.premiumExpiresAt = null;
            await user.save();
          }
        }
        req.user = user;
      } else {
        req.user = null;
      }
    } catch (tokenError) {
      // Token invalid, just set user to null
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
