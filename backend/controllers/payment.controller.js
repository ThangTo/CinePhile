const paymentService = require("../services/payment.service");

const createPaymentLink = async (req, res) => {
  try {
    const { userId, amount, bonus = 0 } = req.body;
    const result = await paymentService.createPaymentLink(userId, amount, bonus);
    res.json(result);
  } catch (error) {
    console.error("Error creating payment link:", error);
    if (error.message === "Missing userId or amount") {
      return res.status(400).send(error.message);
    }
    if (error.message === "User not found") {
      return res.status(404).send(error.message);
    }
    res.status(500).send("Something went error");
  }
};

const handleWebhook = async (req, res) => {
  console.log("[Webhook] Received webhook data");
  try {
    const webhookData = req.body;
    const result = await paymentService.handleWebhook(webhookData);
    res.status(200).json(result);
  } catch (error) {
    console.error("[Webhook] Error:", error);
    res.status(400).json({
      success: false,
      message: "Invalid webhook",
    });
  }
};

module.exports = {
  createPaymentLink,
  handleWebhook,
};
