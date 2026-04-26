const redisService = require('./redis.service');
const crypto = require('crypto');

/**
 * OTP Service for generating and verifying one-time passwords
 */
class OTPService {
  constructor() {
    this.OTP_EXPIRATION = 600; // 10 minutes in seconds
  }

  /**
   * Generate a 6-digit OTP and store it in Redis
   * @param {string} email - User email
   * @param {string} type - OTP type ('register' or 'forgot_password')
   * @returns {string} The generated OTP
   */
  async generateOTP(email, type) {
    const otp = crypto.randomInt(100000, 999999).toString();
    const key = this._getOTPKey(email, type);
    
    // Store in Redis with expiration
    await redisService.set(key, otp, this.OTP_EXPIRATION);
    
    return otp;
  }

  /**
   * Verify an OTP
   * @param {string} email - User email
   * @param {string} otp - OTP provided by user
   * @param {string} type - OTP type
   * @returns {boolean} True if OTP matches and is not expired
   */
  async verifyOTP(email, otp, type) {
    const key = this._getOTPKey(email, type);
    const storedOtp = await redisService.get(key);
    
    if (!storedOtp) return false;
    
    const isValid = storedOtp.toString() === otp.toString();
    
    // Delete OTP after successful verification to prevent reuse
    if (isValid) {
      await redisService.del(key);
    }
    
    return isValid;
  }

  /**
   * Get Redis key for OTP
   */
  _getOTPKey(email, type) {
    return `otp:${type}:${email.toLowerCase().trim()}`;
  }
}

module.exports = new OTPService();
