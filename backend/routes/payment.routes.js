const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.post("/create-payment-link", authMiddleware, paymentController.createPaymentLink); // Payos Checkout
router.post("/payos-webhook", paymentController.handleWebhook);

module.exports = router;
