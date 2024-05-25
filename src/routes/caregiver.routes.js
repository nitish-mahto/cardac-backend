const express = require('express');
const caregiverController = require('../controller/caregiver.controller');
const FileUploadUtil = require('../utils/fileUpload.util.js');
const AuthValidator = require('../middleware/verify-token');
const multer = require('multer');
const router = express.Router();

// Create a storage engine using multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.patch(
    '/details',
    AuthValidator,
    upload.fields(
        [
            { name: 'covid_doc' },
            { name: 'first_aid_doc' },
            { name: 'ndis_doc' },
            { name: 'police_doc' },
            { name: 'child_doc' },
            { name: 'visa_doc' },
            { name: 'resume' }
        ]
    ),
    FileUploadUtil.uploadEventFilesMiddleware,
    caregiverController.updateCaregiverDetails
);

router.post('/unavailability', AuthValidator, caregiverController.unavailability);
router.get('/unavailability', AuthValidator, caregiverController.viewUnavailability);
// router.patch('/unavailability/:id', AuthValidator, caregiverController.editUnavailability);
router.delete('/unavailability/:id', AuthValidator, caregiverController.deleteUnavailability);

router.patch('/availability', AuthValidator, caregiverController.addAvailability);
router.get('/availability-time', AuthValidator, caregiverController.getAvailabilityTime);

router.get('/availability', AuthValidator, caregiverController.getAvailability);
router.get('/appointment', AuthValidator, caregiverController.appointmentBookedList);
router.get('/appointment/:id', AuthValidator, caregiverController.appointmentBookedDetails);
router.patch('/appointment-status/booking/:id', AuthValidator, caregiverController.changeAppointmentStatus);
router.get('/feedback', AuthValidator, caregiverController.getFeedback);
router.patch('/about', AuthValidator, caregiverController.addAbout);

router.post('/highlight', AuthValidator, caregiverController.addHighlight);
router.delete('/highlight/:id', AuthValidator, caregiverController.deleteHighlight);
router.get('/highlight', AuthValidator, caregiverController.getHighlight);

router.post('/can-also-with', AuthValidator, caregiverController.addCanAlsoWith);
router.delete('/can-also-with/:id', AuthValidator, caregiverController.deleteCanAlsoWith);
router.get('/can-also-with', AuthValidator, caregiverController.getCanAlsoWith);

router.post('/clock-in/appointment/:id', AuthValidator, caregiverController.clockIn);
router.post('/verify-clock-in/appointment/:id', AuthValidator, caregiverController.verifyClockIn);
router.patch('/clock-out/appointment/:id', AuthValidator, caregiverController.clockOut);

router.get('/documents-data', AuthValidator, caregiverController.documentsData);
/** module exports */
module.exports = router;
