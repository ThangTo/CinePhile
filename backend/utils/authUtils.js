const isProduction = process.env.NODE_ENV === 'production';

const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  domain: process.env.COOKIE_DOMAIN || undefined,
  path: '/',
};

const ACCESS_TOKEN_MAX_AGE = parseInt(process.env.ACCESS_TOKEN_MAX_AGE_MS, 10) || 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_MAX_AGE =
  parseInt(process.env.REFRESH_TOKEN_MAX_AGE_MS, 10) || 7 * 24 * 60 * 60 * 1000; // 7 days

const attachAuthCookies = (res, tokens = {}) => {
  if (!tokens) return;

  if (tokens.token) {
    res.cookie('accessToken', tokens.token, {
      ...baseCookieOptions,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
  }

  if (tokens.refreshToken) {
    res.cookie('refreshToken', tokens.refreshToken, {
      ...baseCookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }
};

const clearAuthCookies = (res) => {
  res.clearCookie('accessToken', baseCookieOptions);
  res.clearCookie('refreshToken', baseCookieOptions);
};

const getGoogleRedirects = (clientBaseUrl) => {
  const successRedirect =
    process.env.GOOGLE_SUCCESS_REDIRECT || `${clientBaseUrl}/?auth=google_success`;
  const failureRedirect =
    process.env.GOOGLE_FAILURE_REDIRECT ||
    `${clientBaseUrl}/auth/google/callback?auth=google_failed`;
  return { successRedirect, failureRedirect };
};

const getGoogleCallbackUrl = (apiBaseUrl) =>
  process.env.GOOGLE_CALLBACK_URL || `${apiBaseUrl}/api/v1/auth/google/callback`;

module.exports = {
  attachAuthCookies,
  clearAuthCookies,
  getGoogleRedirects,
  getGoogleCallbackUrl,
};
