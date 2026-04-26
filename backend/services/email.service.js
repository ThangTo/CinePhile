const { BrevoClient } = require('@getbrevo/brevo');

/**
 * Email Service using Brevo (Sendinblue) SDK v5+
 */
class EmailService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.client = null;

    if (this.apiKey) {
      this.client = new BrevoClient({ apiKey: this.apiKey });
    } else {
      console.warn('⚠️ BREVO_API_KEY is not set in environment variables. Emails will not be sent.');
    }

    this.sender = {
      name: 'CinePhine',
      email: process.env.EMAIL_SENDER || 'no-reply@cinephine.com'
    };
  }

  /**
   * Send a transactional email
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} htmlContent - HTML content
   */
  async sendEmail(to, subject, htmlContent) {
    if (!this.apiKey || !this.client) {
      console.log(`📧 Mock Email to ${to}: [${subject}]`);
      return { success: true, message: 'Mock email logged (API key missing)' };
    }

    try {
      const data = await this.client.transactionalEmails.sendTransacEmail({
        subject: subject,
        htmlContent: htmlContent,
        sender: this.sender,
        to: [{ email: to }]
      });
      
      return { success: true, messageId: data.messageId };
    } catch (error) {
      console.error('❌ Error sending email via Brevo:', error.message);
      throw new Error('Failed to send email. Please try again later.');
    }
  }

  _getHtmlTemplate(title, description, otp) {
    return `
<!DOCTYPE html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  
  <!--[if mso]>
  <style>
    table {border-collapse:collapse;border-spacing:0;margin:0;}
    div, td {padding:0;}
    div {margin:0 !important;}
  </style>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->

  <style>
    /* Reset */
    html, body {
      margin: 0 auto !important;
      padding: 0 !important;
      height: 100% !important;
      width: 100% !important;
      background-color: #050505;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    * {
      -ms-text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
    }
    
    /* Typography */
    body, table, td, a, p, h1, h2, h3 {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    /* Main Styles */
    .bg-main {
      background-color: #050505;
    }
    
    .glass-card {
      background-color: #121212;
      border: 1px solid #2a2a2a;
      border-radius: 24px;
      overflow: hidden;
      /* Box shadow works on modern clients like Apple Mail/Gmail App */
      box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 216, 117, 0.05);
    }

    .header-glow {
      text-align: center;
      padding: 40px 30px 20px 30px;
    }

    .logo-text {
      margin: 0;
      font-size: 32px;
      font-weight: 900;
      letter-spacing: 8px;
      color: #ffffff;
      text-transform: uppercase;
    }
    
    .logo-highlight {
      color: #ffd875;
    }

    .content-area {
      padding: 10px 40px 40px 40px;
      text-align: center;
    }

    .title-text {
      margin: 0 0 16px 0;
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 0.5px;
    }

    .desc-text {
      margin: 0 0 35px 0;
      font-size: 15px;
      line-height: 1.6;
      color: #a3a3a3;
    }

    /* OTP Box mimicking the web's glassmorphism inputs */
    .otp-wrapper {
      background-color: #0a0a0a;
      border: 1px solid rgba(255, 216, 117, 0.3);
      border-radius: 16px;
      padding: 30px 20px;
      margin: 0 auto 35px auto;
      width: 100%;
      max-width: 300px;
      text-align: center;
    }

    .otp-code {
      margin: 0;
      font-family: 'Courier New', Courier, monospace;
      font-size: 46px;
      font-weight: 800;
      letter-spacing: 12px;
      color: #ffd875;
      margin-right: -12px; /* Offset the last letter spacing */
    }

    .warning-box {
      background-color: #0a0a0a;
      border: 1px solid #1a1a1a;
      border-radius: 12px;
      padding: 16px;
      margin: 0 auto;
    }

    .warning-text {
      margin: 0;
      font-size: 13px;
      color: #737373;
      line-height: 1.5;
    }

    .warning-text span {
      color: #ffd875;
      font-weight: 600;
    }

    .footer {
      background-color: #0a0a0a;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #1a1a1a;
    }

    .footer-text {
      margin: 0 0 8px 0;
      font-size: 12px;
      color: #555555;
      line-height: 1.5;
    }

    /* Mobile Responsive */
    @media screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        border-radius: 0 !important;
        border: none !important;
      }
      .glass-card {
        border-radius: 16px !important;
        border: 1px solid #222 !important;
      }
      .content-area {
        padding: 10px 20px 30px 20px !important;
      }
      .otp-code {
        font-size: 38px !important;
        letter-spacing: 8px !important;
        margin-right: -8px !important;
      }
      .logo-text {
        font-size: 26px !important;
        letter-spacing: 6px !important;
      }
    }
  </style>
</head>

<body class="bg-main" style="margin: 0; padding: 0; width: 100%; background-color: #050505 !important;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#050505" style="background-color: #050505 !important; width: 100%; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Visually Hidden Preheader Text -->
        <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all; font-family: sans-serif;">
          Mã xác thực của bạn là ${otp}. Vui lòng không chia sẻ mã này cho bất kỳ ai.
        </div>

        <!-- Glass Card -->
        <table role="presentation" class="glass-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; margin: 0 auto; background-color: #121212 !important; border: 1px solid #2a2a2a; border-radius: 24px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td class="header-glow" style="text-align: center; padding: 40px 30px 20px 30px;">
              <!-- Top Glowing Divider -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="40" style="margin: 0 auto 20px auto;">
                <tr>
                  <td style="height: 4px; background-color: #ffd875; border-radius: 4px;"></td>
                </tr>
              </table>

              <h1 class="logo-text" style="margin: 0; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #ffffff !important; text-transform: uppercase;">
                CINE<span class="logo-highlight" style="color: #ffd875 !important;">PHINE</span>
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content-area" style="padding: 10px 40px 40px 40px; text-align: center;">
              <h2 class="title-text" style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #ffffff !important; letter-spacing: 0.5px;">
                ${title}
              </h2>
              <p class="desc-text" style="margin: 0 0 35px 0; font-size: 15px; line-height: 1.6; color: #a3a3a3 !important;">
                ${description}
              </p>
              
              <!-- OTP Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 auto 35px auto; max-width: 300px;">
                <tr>
                  <td class="otp-wrapper" style="background-color: #0a0a0a !important; border: 1px solid #ffd875; border-radius: 16px; padding: 30px 20px; text-align: center;">
                    <p class="otp-code" style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 46px; font-weight: 800; letter-spacing: 12px; color: #ffd875 !important;">
                      ${otp}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Warning Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td class="warning-box" style="background-color: #0a0a0a !important; border: 1px solid #1a1a1a; border-radius: 12px; padding: 16px; text-align: center;">
                    <p class="warning-text" style="margin: 0; font-size: 13px; color: #737373 !important; line-height: 1.5;">
                      Mã xác thực này có hiệu lực trong <span style="color: #ffd875 !important; font-weight: 600;">10 phút</span>.<br>Tuyệt đối không chia sẻ mã này cho bất kỳ ai.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer" style="background-color: #0a0a0a !important; padding: 24px 30px; text-align: center; border-top: 1px solid #1a1a1a;">
              <p class="footer-text" style="margin: 0 0 8px 0; font-size: 12px; color: #555555 !important; line-height: 1.5;">
                Email này được gửi tự động từ hệ thống bảo mật của CinePhine.<br>Vui lòng không trả lời email này.
              </p>
              <p class="footer-text" style="margin: 0; font-size: 12px; color: #444444 !important; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} CinePhine. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Send OTP for Registration
   */
  async sendRegistrationOTP(to, otp) {
    const subject = `[CinePhine] Mã xác thực đăng ký tài khoản`;
    const title = "Xác Thực Tài Khoản";
    const description = "Chào mừng bạn đến với thế giới điện ảnh CinePhine! Để hoàn tất quá trình đăng ký, vui lòng sử dụng mã bảo mật dưới đây:";
    const htmlContent = this._getHtmlTemplate(title, description, otp);
    return this.sendEmail(to, subject, htmlContent);
  }

  /**
   * Send OTP for Password Reset
   */
  async sendForgotPasswordOTP(to, otp) {
    const subject = `[CinePhine] Yêu cầu khôi phục mật khẩu`;
    const title = "Khôi Phục Mật Khẩu";
    const description = "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản CinePhine của bạn. Dưới đây là mã bảo mật (OTP) của bạn:";
    const htmlContent = this._getHtmlTemplate(title, description, otp);
    return this.sendEmail(to, subject, htmlContent);
  }
}

module.exports = new EmailService();