const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { getRandomAvatar } = require('../utils/avatarUtils');
const redisService = require('./redis.service');
const avatarService = require('./avatar.service');
const { isPremiumActive } = require('../utils/premiumUtils');

// Helper to generate tokens
const generateTokens = (userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '1h',
  });

  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });

  return { token, refreshToken };
};

const generateAuthPayload = (user) => {
  // Convert Mongoose document to plain object to ensure all fields are included
  const userObj = user.toObject ? user.toObject() : user;
  return {
    user: userObj,
    ...generateTokens(user._id || userObj._id),
  };
};

/**
 * Register new user
 * @param {Object} userData - { username, email, password }
 * @returns {Promise<Object>} { user: Object, token: string, refreshToken: string }
 */
const register = async (userData) => {
  const { username, email, password } = userData;

  if (!username || !email || !password) {
    throw new Error('Username, email and password are required');
  }

  // Check if user exists by email (email is unique)
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Check if username already exists
  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    throw new Error('Username already exists');
  }

  // Register user with passport-local-mongoose
  // User.register takes a user instance and a password
  // Assign random default avatar
  const randomAvatar = getRandomAvatar();
  const user = new User({ username, email, avatar: randomAvatar });

  return new Promise((resolve, reject) => {
    User.register(user, password, async function (err, registeredUser) {
      if (err) {
        // Handle different error types from passport-local-mongoose
        if (err.name === 'UserExistsError') {
          return reject(new Error('User already exists'));
        }
        return reject(new Error(err.message || 'Registration failed'));
      }

      try {
        // Ensure avatar is set (in case it wasn't saved)
        if (!registeredUser.avatar) {
          registeredUser.avatar = randomAvatar;
          await registeredUser.save();
        }
        const authPayload = generateAuthPayload(registeredUser);
        resolve(authPayload);
      } catch (error) {
        reject(error);
      }
    });
  });
};

/**
 * Login user
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} { user: Object, token: string, refreshToken: string }
 */
const login = async (credentials) => {
  const { email, password } = credentials;

  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Authenticate using passport-local-mongoose (configured to use email)
  return new Promise((resolve, reject) => {
    const authenticate = User.authenticate();
    authenticate(normalizedEmail, password, async (err, user, info) => {
      if (err) {
        return reject(err);
      }
      if (!user) {
        // Handle different error cases from passport-local-mongoose
        const errorMessage = info?.message || 'Invalid credentials';
        return reject(new Error(errorMessage));
      }

      try {
        await avatarService.migrateStoredAvatarToR2(user);
        // Generate tokens and return auth payload
        const authPayload = generateAuthPayload(user);
        resolve(authPayload);
      } catch (error) {
        reject(error);
      }
    });
  });
};

/**
 * Logout user
 * Blacklist token in Redis for proper logout
 * @param {string} token - Access token to blacklist
 * @returns {Promise<Object>} { message: string }
 */
const logout = async (token) => {
  if (!token) {
    return { message: 'Logged out successfully' };
  }

  try {
    // Decode token to get expiration time
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return { message: 'Logged out successfully' };
    }

    // Calculate remaining time until token expires
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    // Blacklist token in Redis (if Redis available)
    if (redisService.isConnected && expiresIn > 0) {
      await redisService.set(`blacklist:${token}`, true, expiresIn);
      console.log(`✅ Token blacklisted, expires in ${expiresIn}s`);
    }

    return { message: 'Logged out successfully' };
  } catch (error) {
    console.error('Logout error:', error.message);
    // Still return success even if blacklist fails
    return { message: 'Logged out successfully' };
  }
};

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} { token: string }
 */
const refreshToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new Error('Refresh token is required');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error('User not found');
    }

    return generateTokens(user._id);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

/**
 * Get current user by token
 * @param {string} token - Access token
 * @returns {Promise<Object>} User object
 */
const getCurrentUser = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) throw new Error('User not found');
    await avatarService.migrateStoredAvatarToR2(user);

    // Premium: mặc định bật glitter nếu chưa có effect
    if (isPremiumActive(user) && (!user.cursorEffectId || user.cursorEffectId === 'none')) {
      user.cursorEffectId = 'glitter';
      await user.save(); // Lưu vào DB để không phải gán lại mỗi lần login
    }

    return user;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

const normalizeDisplayName = (name = '') => {
  const cleaned = name.trim();
  if (!cleaned) return null;
  return cleaned
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const loginWithGoogleProfile = async (profile) => {
  const email = profile?.emails?.[0]?.value?.toLowerCase();
  if (!email) {
    throw new Error('Google account does not provide an email address');
  }

  const googleId = profile.id;
  let user = await User.findOne({ $or: [{ googleId }, { email }] });

  if (!user) {
    // New user - assign random default avatar
    const displayName =
      normalizeDisplayName(profile.displayName) || email.split('@')[0] || `user${Date.now()}`;
    const username = displayName.toLowerCase().replace(/\s+/g, '');
    const randomAvatar = getRandomAvatar();

    user = new User({
      username,
      email,
      googleId,
      avatar: randomAvatar,
      role: 'user',
    });
  } else {
    // Existing user - update googleId if not set, but keep existing avatar
    if (!user.googleId) {
      user.googleId = googleId;
    }
    // If user doesn't have an avatar, assign a random one
    if (!user.avatar) {
      user.avatar = getRandomAvatar();
    }
  }

  await user.save();
  await avatarService.migrateStoredAvatarToR2(user);
  // Ensure avatar is included in the returned user object
  const userObj = user.toObject ? user.toObject() : user;
  return generateAuthPayload(userObj);
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - { fullName?, avatar?, bio?, ... }
 * @returns {Promise<Object>} Updated user object
 */
const updateProfile = async (userId, updates = {}, avatarFile = null) => {
  const allowedUpdates = ['username', 'email', 'avatar', 'gender'];
  const actualUpdates = {};
  const hasAvatarField = Object.prototype.hasOwnProperty.call(updates, 'avatar');

  Object.keys(updates).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      actualUpdates[key] = updates[key];
    }
  });

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (Object.prototype.hasOwnProperty.call(actualUpdates, 'username')) {
    user.username = actualUpdates.username;
  }

  if (Object.prototype.hasOwnProperty.call(actualUpdates, 'email')) {
    user.email = actualUpdates.email;
  }

  if (Object.prototype.hasOwnProperty.call(actualUpdates, 'gender')) {
    user.gender = actualUpdates.gender;
  }

  if (avatarFile) {
    await avatarService.updateUserAvatarFromFile(user, avatarFile);
    return user;
  }

  if (hasAvatarField) {
    await avatarService.updateUserAvatarFromValue(user, actualUpdates.avatar);
    return user;
  }

  await user.save();

  return user;
};

/**
 * Change password
 * @param {string} userId - User ID
 * @param {Object} passwords - { oldPassword, newPassword }
 * @returns {Promise<Object>} { message: string }
 */
const changePassword = async (userId, passwords) => {
  const { oldPassword, newPassword } = passwords;

  if (!oldPassword || !newPassword) {
    throw new Error('Mật khẩu hiện tại và mật khẩu mới là bắt buộc');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('Người dùng không tồn tại');
  }

  try {
    await user.changePassword(oldPassword, newPassword);
  } catch (error) {
    if (error.name === 'IncorrectPasswordError' || error.message.includes('Incorrect password')) {
      throw new Error('Mật khẩu hiện tại không chính xác');
    }
    // Re-throw other errors with original message
    throw new Error(error.message || 'Không thể thay đổi mật khẩu. Vui lòng thử lại.');
  }

  return { message: 'Mật khẩu đã được thay đổi thành công' };
};

/**
 * Send forgot password email
 * @param {string} email - User email
 * @returns {Promise<Object>} { message: string }
 */
const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found');
  }

  // Generate reset token (short lived)
  const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });

  // In a real app, send email here
  console.log(`Reset token for ${email}: ${resetToken}`);

  return { message: 'Password reset email sent' };
};

/**
 * Reset password with token
 * @param {Object} resetData - { token, newPassword }
 * @returns {Promise<Object>} { message: string }
 */
const resetPassword = async (resetData) => {
  const { token, newPassword } = resetData;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Use passport-local-mongoose setPassword method
    await user.setPassword(newPassword);
    await user.save();

    return { message: 'Password reset successfully' };
  } catch (error) {
    throw new Error('Invalid or expired reset token');
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getCurrentUser,
  loginWithGoogleProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};
