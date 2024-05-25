const express = require("express");
const paymentController = require("../controller/payment.controller");
const AuthValidator = require("../middleware/verify-token");
const bodyParser = require("body-parser");
const router = express.Router();

router.get('/publishable-key', AuthValidator, paymentController.getPublishableKey);
router.post('/payment-intent', AuthValidator, paymentController.paymentIntent);
router.post('/create-checkout-session', AuthValidator, paymentController.createCheckoutSession);
router.post('/webhook', bodyParser.raw({ type: 'application/json' }), paymentController.webhook);

/********************************** payment related routes ******************************* */

router.get('/my-payments', AuthValidator, paymentController.myPayments);
router.get('/caregiver-payments', AuthValidator, paymentController.caregiverPayments);
router.get('/my-earn', AuthValidator, paymentController.myEarning);
router.get('/payments', AuthValidator, paymentController.payments);
router.get('/payment-details/appointment/:id', AuthValidator, paymentController.paymentDetails);
module.exports = router;