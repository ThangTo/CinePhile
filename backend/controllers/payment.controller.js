const paymentService = require("../services/payment.service");

const createPaymentLink = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { packageId } = req.body;
    const result = await paymentService.createPaymentLink({
      userId,
      packageId,
    });
    res.json(result);
  } catch (error) {
    console.error("Error creating payment link:", error);
    if (error.message === "Missing userId or payment package") {
      return res.status(400).json({ message: error.message });
    }
    if (error.message === "Missing payment amount") {
      return res.status(400).json({ message: error.message });
    }
    if (error.message === "Coin package not found") {
      return res.status(400).json({ message: error.message });
    }
    if (error.message === "User not found") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Something went error" });
  }
};

const handleWebhook = async (req, res) => {
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
