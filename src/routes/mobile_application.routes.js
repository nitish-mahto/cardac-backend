const express = require("express");
const router = express.Router();
const multer = require("multer");
const FileUploadUtils = require("../utils/fileUpload.util.js");
const AuthValidator = require("../middleware/verify-token.js");
const applicationController = require("../controller/mobile_application.controller.js");

// Create a storage engine using multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/", AuthValidator,
    upload.single("file"),
    FileUploadUtils.uploadApkMiddleware("file"),
    applicationController.addApplication);

router.get("/", applicationController.viewApplication);
router.delete("/:id", AuthValidator, applicationController.deleteApplication);


/** module exports */
module.exports = router;