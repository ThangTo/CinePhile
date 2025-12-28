const { PayOS } = require('@payos/node');
const User = require('../models/user.model');

const payOS = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

// Store pending payment requests in memory (Note: Data lost on restart)
const pendingRequests = new Map();

const createPaymentLink = async (userId, amount, bonus = 0) => {
  const YOUR_DOMAIN =
    process.env.CLIENT_URL_LOCAL ||
    process.env.CLIENT_URL ||
    'https://decent-normally-bedbug.ngrok-free.app';

  if (!userId || !amount) {
    throw new Error('Missing userId or amount');
  }

  const orderCode = Number(String(Date.now()).slice(-6));
  const money = parseInt(amount) * 10; // TODO money

  const body = {
    orderCode: orderCode,
    amount: money,
    description: 'Thanh toan don hang',
    returnUrl: `${YOUR_DOMAIN}`,
    cancelUrl: `${YOUR_DOMAIN}`,
  };

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // 1. Store request in memory instead of updating coins immediately
  const parsedAmount = parseInt(amount);
  const parsedBonus = parseInt(bonus) || 0;
  pendingRequests.set(orderCode, {
    userId: userId,
    amount: parsedAmount, // Original coin amount
    bonus: parsedBonus, // Bonus coins
    status: 'PENDING',
  });

  // 2. Create PayOS Payment Link
  const paymentLinkResponse = await payOS.paymentRequests.create(body);

  return {
    checkoutUrl: paymentLinkResponse.checkoutUrl,
  };
};

const handleWebhook = async (webhookData) => {
  // console.log("[Webhook] Received webhook data");
  console.log('webhookData', webhookData);

  // 2. Check if succeed
  if (webhookData.code === '00' && webhookData.success === true) {
    const { orderCode } = webhookData.data;
    console.log(`[Webhook] Processing success payment for Order ${orderCode}`);

    // 3. Find pending request
    if (pendingRequests.has(orderCode)) {
      const request = pendingRequests.get(orderCode);
      const { userId, amount, bonus = 0 } = request;

      // 4. Update User Coin (amount + bonus)
      const user = await User.findById(userId);
      if (user) {
        const totalCoins = amount + bonus;
        user.coin = (user.coin || 0) + totalCoins;
        await user.save();
      }

      // 5. Cleanup
      pendingRequests.delete(orderCode);
    } else {
      console.warn(
        `[Webhook] Order ${orderCode} not found in pending requests (may have restarted or expired)`,
      );
    }
  }

  return { success: true, message: 'Webhook processed' };
};

module.exports = {
  createPaymentLink,
  handleWebhook,
};
