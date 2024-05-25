const express = require("express");
const router = express.Router();
const authRoutes = require("./auth.routes");
const commonRoutes = require("./common.routes");
const adminRoutes = require("./admin.routes");
const patientRoutes = require("./patient.routes");
const caregiverRoutes = require("./caregiver.routes");
const paymentRoutes = require("./payment.routes");
const mobileApplicationRoutes = require("./mobile_application.routes");


router.use("/auth", authRoutes);
router.use("/common", commonRoutes);
router.use("/admin", adminRoutes);
router.use("/patient", patientRoutes);
router.use("/caregiver", caregiverRoutes);
router.use("/payment", paymentRoutes);
router.use("/mobile-application", mobileApplicationRoutes);

// route module exports
module.exports = router;
