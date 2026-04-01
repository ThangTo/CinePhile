const { PayOS } = require('@payos/node');
const User = require('../models/user.model');
const Transaction = require('../models/transaction.model');

const payOS = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

const createPaymentLink = async (userId, amount, bonus = 0) => {
  const YOUR_DOMAIN =
    process.env.CLIENT_URL_LOCAL ||
    process.env.CLIENT_URL ||
    'https://decent-normally-bedbug.ngrok-free.app';

  if (!userId || !amount) {
    throw new Error('Missing userId or amount');
  }

  // Khắc phục OrderCode: PayOS CHỈ chấp nhận số (Integer), KHÔNG chấp nhận chữ cái hay ký tự đặc biệt.
  // Ta dùng Timestamp (13 số) + Random (2 số) = 15 số (an toàn nằm dưới giới hạn Number.MAX_SAFE_INTEGER của JavaScript)
  const timestamp = Date.now().toString(); // 13 digits
  const randomSuffix = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, '0'); // 2 digits
  const orderCode = Number(timestamp + randomSuffix);

  const money = parseInt(amount);

  const body = {
    orderCode: orderCode,
    amount: money,
    description: 'Thanh toan don hang',
    returnUrl: `${YOUR_DOMAIN}/account?tabs=coin&success=true`,
    cancelUrl: `${YOUR_DOMAIN}/account?tabs=coin&canceled=true`,
  };

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // 1. Store request in MongoDB DB instead of memory
  const parsedAmount = parseInt(amount);
  const parsedBonus = parseInt(bonus) || 0;

  await Transaction.create({
    user: userId,
    orderCode: orderCode.toString(),
    amount: money,
    coinAmount: parsedAmount,
    bonusCoin: parsedBonus,
    provider: 'PAYOS',
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

    // 3. Find pending request in Database
    const transaction = await Transaction.findOne({
      orderCode: orderCode.toString(),
      status: 'PENDING',
    });

    if (transaction) {
      console.log(`[Webhook] Processing success payment for Order ${orderCode}`);

      // 4. Update User Coin
      const user = await User.findById(transaction.user);
      if (user) {
        const totalCoins = transaction.coinAmount + transaction.bonusCoin;
        user.coin = (user.coin || 0) + totalCoins;
        await user.save();
      }

      // 5. Cleanup Status
      transaction.status = 'SUCCESS';
      transaction.webhookData = webhookData;
      await transaction.save();
    } else {
      console.warn(`[Webhook] Order ${orderCode} not found in PENDING transactions.`);
    }
  }

  return { success: true, message: 'Webhook processed' };
};

module.exports = {
  createPaymentLink,
  handleWebhook,
};
