const express = require("express");
const router = express.Router();
const multer = require("multer");
const config = require("../config/config");
const FileUploadUtils = require("../utils/fileUpload.util.js");
const AuthValidator = require("../middleware/verify-token");
const commonController = require("../controller/common.controller");

// Create a storage engine using multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/image-upload", AuthValidator,
    upload.single('profile'),
    FileUploadUtils.fileUploadMiddleware("profile"),
    commonController.imageUpload);

router.patch("/edit-profile", AuthValidator,
    upload.single('profile'),
    FileUploadUtils.fileUploadMiddleware("profile"),
    commonController.editProfile);

router.get("/profile", AuthValidator, commonController.viewProfile);
router.patch("/profile", AuthValidator, commonController.editProfile);

router.get("/countries", commonController.countries);
router.get("/states/country/:id", commonController.states);
router.get("/language-speak", commonController.speakLanguages);

router.post("/chat-user/receiver/:id", AuthValidator, commonController.chatUsers);
router.get("/chat-user", AuthValidator, commonController.getChatUsers);

router.get("/services-list", AuthValidator, commonController.viewAllServices);
router.get("/services", AuthValidator, commonController.viewServices);
router.patch("/services", AuthValidator, commonController.updateServices);


router.get('/guidelines', commonController.viewCompanyGuidelines);
router.get('/policies', commonController.viewCompanyPolicies);
router.get('/terms', commonController.viewCompanyTerms);
router.get('/trust-safety', commonController.viewCompanyTrustSafety);

/** module exports */
module.exports = router;