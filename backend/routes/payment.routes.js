const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");

router.post("/create-payment-link", paymentController.createPaymentLink); // Payos Checkout
router.post("/payos-webhook", paymentController.handleWebhook);

module.exports = router;
