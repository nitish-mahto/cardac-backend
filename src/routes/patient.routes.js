const express = require("express");
const patientController = require("../controller/patient.controller");
const AuthValidator = require("../middleware/verify-token");
const router = express.Router();
const FileUploadUtils = require("../utils/fileUpload.util.js");
const multer = require('multer');

// Create a storage engine using multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// add preferences
router.post('/preference', AuthValidator, patientController.addPreferences);

// member section
router.post('/member', AuthValidator, patientController.addMemberDetails);
router.patch('/member/:id', AuthValidator, patientController.updateMemberDetails);

router.get('/member', AuthValidator, patientController.getMembers);
router.get('/member/:id', AuthValidator, patientController.getMemberDetails);
router.delete('/member/:id', AuthValidator, patientController.deleteMemberDetails);

// condition section
router.post('/condition', AuthValidator, patientController.addCondition);
router.get('/condition', AuthValidator, patientController.getCondition);
router.delete('/condition/:id', AuthValidator, patientController.deleteCondition);

// special-needs section
router.post('/special-needs', AuthValidator, patientController.addSpecialNeeds);
router.get('/special-needs', AuthValidator, patientController.getSpecialNeeds);
router.delete('/special-needs/:id', AuthValidator, patientController.deleteSpecialNeeds);

// caregiver section
router.get('/caregiver/:id', AuthValidator, patientController.caregiverDetails);
router.get('/caregiver', AuthValidator, patientController.caregiver);

// Availability
router.get('/availability/caregiver/:id', AuthValidator, patientController.getAvailability);

// appointment section
router.post('/appointment/caregiver/:id', AuthValidator, patientController.appointmentBooking);
router.get('/appointment', AuthValidator, patientController.appointmentBookedList);
router.get('/appointment/:id', AuthValidator, patientController.appointmentBookedDetails);

// feedback section
router.post('/feedback/caregiver/:id', AuthValidator, patientController.addFeedback);
router.get("/feedback/caregiver/:id", AuthValidator, patientController.getFeedback);

// caregiver search filter data
router.get("/filter", AuthValidator, patientController.filterData);

router.post('/send-referral', AuthValidator, patientController.sendReferral);


router.get('/check-unavailability/:id', AuthValidator, patientController.checkPricingAndUnavailability);


/** module exports */
module.exports = router;