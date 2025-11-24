const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

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

const generateAuthPayload = (user) => ({
  user,
  ...generateTokens(user._id),
});

/**
 * Register new user
 * @param {Object} userData - { username, email, password }
 * @returns {Promise<Object>} { user: Object, token: string, refreshToken: string }
 */
const register = async (userData) => {
  const { username, email, password } = userData;
  console.log('here');

  // Check if user exists (passport-local-mongoose handles username uniqueness, but we check email too)
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Register user with passport-local-mongoose
  // User.register takes a user instance and a password
  const user = new User({ username, email });
  console.log('user');
  User.register(user, password, async function (err, user) {
    if (err) {
      console.log(err);
    }
    console.log('registered', user);
  });

  return generateAuthPayload(user);
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
  const { user, error } = await new Promise((resolve, reject) => {
    const authenticate = User.authenticate();
    authenticate(normalizedEmail, password, (err, user, info) => {
      if (err) return reject(err);
      if (!user) return resolve({ error: info });
      resolve({ user });
    });
  });

  if (error || !user) {
    throw new Error(error ? error.message : 'Invalid credentials');
  }

  // // Update last login
  // user.lastLogin = Date.now();
  // await user.save();

  return generateAuthPayload(user);
};

/**
 * Logout user
 * @param {string} userId - User ID
 * @param {string} token - Access token
 * @returns {Promise<Object>} { message: string }
 */
const logout = async (userId) => {
  // In a stateless JWT setup, we can't really "invalidate" tokens without a blacklist (Redis, etc.)
  // For now, we'll just return success. Client should remove token.
  return { message: 'Logged out successfully' };
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

const generateUniqueUsername = async (base) => {
  let username = base;
  let counter = 1;
  while (await User.findOne({ username })) {
    username = `${base}${counter}`;
    counter += 1;
  }
  return username;
};

const loginWithGoogleProfile = async (profile) => {
  const email = profile?.emails?.[0]?.value?.toLowerCase();
  if (!email) {
    throw new Error('Google account does not provide an email address');
  }

  const googleId = profile.id;
  let user = await User.findOne({ $or: [{ googleId }, { email }] });
  const avatar = profile?.photos?.[0]?.value;

  if (!user) {
    const displayName =
      normalizeDisplayName(profile.displayName) || email.split('@')[0] || `user${Date.now()}`;
    const baseUsername = displayName.toLowerCase().replace(/\s+/g, '');
    const username = await generateUniqueUsername(baseUsername || `user${Date.now()}`);

    user = new User({
      username,
      email,
      googleId,
      avatar: avatar || undefined,
      role: 'user',
    });
  } else {
    if (!user.googleId) {
      user.googleId = googleId;
    }
    if (!user.avatar && avatar) {
      user.avatar = avatar;
    }
  }

  await user.save();
  return generateAuthPayload(user);
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - { fullName?, avatar?, bio?, ... }
 * @returns {Promise<Object>} Updated user object
 */
const updateProfile = async (userId, updates) => {
  const allowedUpdates = ['username', 'email', 'avatar', 'gender'];
  const actualUpdates = {};

  Object.keys(updates).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      actualUpdates[key] = updates[key];
    }
  });

  const user = await User.findByIdAndUpdate(userId, actualUpdates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    throw new Error('User not found');
  }

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

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Use passport-local-mongoose changePassword method
  await user.changePassword(oldPassword, newPassword);

  return { message: 'Password changed successfully' };
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
