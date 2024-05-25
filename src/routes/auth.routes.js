const express = require("express");
const authController = require("../controller/auth.controller");
const AuthValidator = require("../middleware/verify-token");
const router = express.Router();

router.post("/register", authController.registration);
router.patch("/verify-account", AuthValidator, authController.verifyAccount);
router.post("/login", authController.login);

router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-otp", AuthValidator, authController.verifyOtp);
router.post("/resend-otp", authController.resendOtp);
router.patch("/reset-password", AuthValidator, authController.resetPassword);

router.post("/forgot-password-link", authController.forgotPasswordLink);
router.patch("/reset-password-link", authController.resetPasswordLink);

router.patch("/change-password", AuthValidator, authController.changePassword);

router.delete("/account", AuthValidator, authController.deleteAccount);

/** module exports */
module.exports = router;