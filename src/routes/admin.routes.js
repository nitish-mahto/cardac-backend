const express = require('express');
const adminController = require('../controller/admin.controller');
const AuthValidator = require('../middleware/verify-token');
const router = express.Router();
const FileUploadUtil = require('../utils/fileUpload.util.js');
const multer = require('multer');

// Create a storage engine using multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/login', adminController.login);
router.get('/profile', AuthValidator, adminController.viewProfile);
router.get('/dashboard', AuthValidator, adminController.dashboard);

router.get("/caregivers", AuthValidator, adminController.caregivers);
// router.get("/patients", AuthValidator, adminController.patient);

router.get('/user', AuthValidator, adminController.usersList);
router.get('/user/:id', AuthValidator, adminController.getUserDetails);
router.delete('/user/:id', AuthValidator, adminController.deleteAccount);

router.patch('/background-status/caregiver/:id', AuthValidator, adminController.changeBackgroundStatus);
router.patch('/verify-doc/caregiver/:id', AuthValidator, adminController.verifyDoc);
router.patch('/account-status/user/:id', AuthValidator, adminController.changeAccountStatus);
router.get('/appointment', AuthValidator, adminController.appointmentBooking);
router.get('/appointment/:id', AuthValidator, adminController.appointmentBookedDetails);
router.get('/appointment-list/:id', AuthValidator, adminController.appointmentBookingById);

router.patch('/services-cost', AuthValidator, adminController.changeServiceCost);
router.get('/services-cost', AuthValidator, adminController.getServiceCost);

router.post('/caregiver-registration', AuthValidator,
    upload.fields([{ name: 'covid_doc' }, { name: 'first_aid_doc' }, { name: 'ndis_doc' }, { name: 'police_doc' }, { name: 'child_doc' }, { name: 'visa_doc' }, { name: 'resume' }]),
    FileUploadUtil.uploadEventFilesMiddleware,
    adminController.caregiverRegistration);

router.patch('/caregiver/:id', AuthValidator,
    upload.fields([{ name: 'covid_doc' }, { name: 'first_aid_doc' }, { name: 'ndis_doc' }, { name: 'police_doc' }, { name: 'child_doc' }, { name: 'visa_doc' }, { name: 'resume' }]),
    FileUploadUtil.uploadEventFilesMiddleware,
    adminController.updateCaregiver);

router.patch('/guidelines', AuthValidator, adminController.updateCompanyGuidelines);
router.get('/guidelines', adminController.viewCompanyGuidelines);

router.patch('/policies', AuthValidator, adminController.updateCompanyPolicies);
router.get('/policies', adminController.viewCompanyPolicies);

router.patch('/terms', AuthValidator, adminController.updateCompanyTerms);
router.get('/terms', adminController.viewCompanyTerms);

router.patch('/trust-safety', AuthValidator, adminController.updateCompanyTrustSafety);
router.get('/trust-safety', adminController.viewCompanyTrustSafety);

// services section
router.post('/services', AuthValidator, adminController.addServices);
router.patch('/services/:id', AuthValidator, adminController.updateServices);
router.delete('/services/:id', AuthValidator, adminController.deleteServices);

// change appointment
router.patch('/appointment/:id', AuthValidator, adminController.updateAppointment);
// referrals
router.get('/referrals', AuthValidator, adminController.viewReferrals);

// unavailability
router.get('/unavailability/caregiver/:id', AuthValidator, adminController.unavailability);
router.post('/unavailability/caregiver/:id', AuthValidator, adminController.addUnavailability);

// unavailability
router.get('/availability/caregiver/:id', AuthValidator, adminController.availability);

// holiday
router.post('/holiday', AuthValidator, adminController.addHoliday);
router.get('/holiday', AuthValidator, adminController.viewHoliday);
router.delete('/holiday/:id', AuthValidator, adminController.deleteHoliday);

// speaking_languages
router.post('/language-speak', AuthValidator, adminController.addLanguageSpeak);
router.delete('/language-speak/:id', AuthValidator, adminController.deleteLanguage);

/** module exports */
module.exports = router;
