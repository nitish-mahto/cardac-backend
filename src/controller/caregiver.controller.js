const _ = require('lodash');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const Users = require('../models/user.model');
const Verifications = require('../models/verifications.model');
const AppointmentBooking = require('../models/appointment_booking.model');
const CaregiverDetails = require('../models/caregiver_details.model');
const PatientMember = require('../models/patient_member.model');
const Highlights = require('../models/highlights.model');
const CanAlsoWith = require('../models/can_also_with.model');
const CaregiverUnavailability = require('../models/caregiver_unavailability.model');
const FeedbackSummary = require('../models/feedback_summary.model');
const Feedback = require('../models/feedback.model');
const moment = require('moment');
const { Op, where } = require('sequelize');
const ServicesCost = require('../models/services_cost.model');
const sendEmail = require('../utils/sendEmail');
const { generateTimeSlots, generateUnavailabilitySlots, generateRemainingSlots, } = require('../utils/utils.js');
const generateOTP = require('../utils/generateOTP');
const Conditions = require('../models/condition.model');
const SpecialNeeds = require('../models/special_needs.model');
const languageSpeak = require('../models/language_speak.model');
const Holiday = require('../models/holiday.model');
const NewCaregiverAvailability = require("../models/newCaregiverAvailability.js");
const { getDayFromDate, generateAvailabilityStatus, getAppointmentsSlots, getUnavailableSlots, allSlots } = require('../utils/utils.js');
const { deleteImageFromS3 } = require("../utils/fileUpload.util.js");


/** update details */
async function updateCaregiverDetails(req, res) {
    try {
        // joi schema validation
        const schema = Joi.object().keys({
            covid_doc: Joi.string().allow(''),
            first_aid_doc: Joi.string().allow(''),
            ndis_doc: Joi.string().allow(''),

            police_doc: Joi.string().max(100).allow(''),
            child_doc: Joi.string().max(100).allow(''),
            visa_doc: Joi.string().max(255).allow(''),
            resume: Joi.string().max(255).allow(''),

            is_resume: Joi.string().valid('yes', 'no'),
            is_disability: Joi.string().valid('yes', 'no').allow(''),
            week_hours: Joi.string().allow(null, ''),
            is_police_check: Joi.string().valid('yes', 'no').allow(''),
            qualification: Joi.string().allow(''),
            child_check: Joi.string().valid('yes', 'no').allow(''),
            ndis_check: Joi.string().valid('yes', 'no').allow(''),
            first_aid_check: Joi.string().valid('yes', 'no').allow(''),
            worker_role: Joi.string().max(50).allow(null, ''),
            work_area: Joi.string().max(30).allow(''),
            language_speak: Joi.string().allow(''),
            other_language: Joi.string().allow(''),
            experience: Joi.string().allow(''),

        });

        let { value, error } = schema.validate({ ...req.body });
        if (error) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid request data',
                data: {
                    original: error._object,
                    details: _.map(error.details, ({ message, type }) => ({
                        message: message.replace(/['"]/g, ''),
                        type
                    }))
                }
            });
        }
        // Validation for experience less or equal 30
        if (value.experience >= 30) return res.status(403).json({ status: 'error', message: 'Experience must be less than 30.' });

        const userId = req.userId;
        let user = await Users.findOne({
            where: { id: userId, role: 'caregiver' }
        });

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Only caregiver can add additional details.'
            });
        }

        let caregiverData = await CaregiverDetails.findOne({ where: { user_id: userId } });

        // When document reupload then set status and verify-not 'pending' and null respectively
        if (value?.covid_doc && value?.covid_doc != "" && value?.covid_doc != null && caregiverData && caregiverData?.covid_doc) {
            let covidDocFileUrl = await caregiverData?.covid_doc.replace(/^\//, "");
            await deleteImageFromS3(covidDocFileUrl);

            await CaregiverDetails.update(
                {
                    covid_doc_status: 'pending',
                    covid_doc_verified_notes: null
                },
                {
                    where: { user_id: userId }
                }
            );
        }

        if (value?.first_aid_doc && value?.first_aid_doc != "" && value?.first_aid_doc != null && caregiverData && caregiverData?.first_aid_doc) {
            let firstAidDocFileUrl = await caregiverData?.first_aid_doc.replace(/^\//, "");
            await deleteImageFromS3(firstAidDocFileUrl);
            await CaregiverDetails.update(
                {
                    first_aid_doc_status: 'pending',
                    first_aid_doc_verified_notes: null
                },
                {
                    where: { user_id: userId }
                }
            );
        }

        if (value?.ndis_doc && value?.ndis_doc != "" && value?.ndis_doc != null && caregiverData && caregiverData?.ndis_doc) {
            let ndisDocFileUrl = await caregiverData?.ndis_doc.replace(/^\//, "");
            await deleteImageFromS3(ndisDocFileUrl);
            await CaregiverDetails.update(
                {
                    ndis_doc_status: 'pending',
                    ndis_doc_verified_notes: null
                },
                {
                    where: { user_id: userId }
                }
            );
        }

        if (value?.police_doc && value?.police_doc != "" && value?.police_doc != null && caregiverData && caregiverData?.police_doc) {
            let policeDocFileUrl = await caregiverData?.police_doc.replace(/^\//, "");
            await deleteImageFromS3(policeDocFileUrl);
            await CaregiverDetails.update(
                {
                    police_doc_status: 'pending',
                    police_doc_verified_notes: null
                },
                {
                    where: { user_id: userId }
                }
            );
        }

        if (value?.child_doc && value?.child_doc != "" && value?.child_doc != null && caregiverData && caregiverData?.child_doc) {
            let childDocFileUrl = await caregiverData?.child_doc.replace(/^\//, "");
            await deleteImageFromS3(childDocFileUrl);
            await CaregiverDetails.update(
                {
                    child_doc_status: 'pending',
                    child_doc_verified_notes: null
                },
                {
                    where: { user_id: userId }
                }
            );
        }

        if (value?.visa_doc && value?.visa_doc != "" && value?.visa_doc != null && caregiverData && caregiverData?.visa_doc) {
            let visaDocFileUrl = await caregiverData?.visa_doc?.replace(/^\//, "");
            await deleteImageFromS3(visaDocFileUrl);
            await CaregiverDetails.update(
                {
                    visa_doc_status: 'pending',
                    visa_doc_verified_notes: null
                },
                {
                    where: { user_id: userId }
                }
            );
        }

        if (value?.resume && value?.resume != "" && value?.resume != null && caregiverData && caregiverData?.resume) {
            if (caregiverData.is_resume == 'yes') {
                let resumeFileUrl = await caregiverData?.resume?.replace(/^\//, "");
                await deleteImageFromS3(resumeFileUrl);
            }
            await CaregiverDetails.update(
                {
                    resume_status: 'pending',
                    resume_verified_notes: null
                },
                {
                    where: { user_id: userId }
                }
            );
        }


        // Check if other_language is present
        if (value.other_language) {
            // Split the comma-separated string into an array
            const languagesArray = value.other_language.split(',');

            // Loop through each language, capitalize the first letter, and create a new record in the database if it doesn't already exist
            for (const lang of languagesArray) {
                const trimmedLang = lang.trim();
                console.log('trimmedLang:<><><--------- ', trimmedLang);
                const capitalizedLang = trimmedLang.charAt(0).toUpperCase() + trimmedLang.slice(1);
                console.log('capitalizedLang: ---------->', capitalizedLang);

                // Check if the language already exists in the database
                const existingLanguage = await languageSpeak.findOne({ where: { language: capitalizedLang } });
                console.log('existingLanguage: <--------->', existingLanguage);

                // If the language doesn't exist, create a new record
                if (!existingLanguage) {
                    await languageSpeak.create({ language: capitalizedLang });
                }
                // If the language already exists, you can handle it as needed (e.g., log a message or skip adding)
                else {
                    console.log(`Language '${capitalizedLang}' already exists in the database.`);
                    // You can choose to skip or handle this case based on your requirements
                }
            }
        }

        let language_speak;
        if (value.other_language) {
            language_speak = `${value.language_speak},${value.other_language}`;
        } else {
            language_speak = `${value.language_speak}`;
        }

        const lastServiceCost = await ServicesCost.findOne({ order: [['created_at', 'DESC']] });

        let [updatedCount] = await CaregiverDetails.update(
            {
                ...value, language_speak, background_submitted: true, background_verified: 'pending',
                services_cost: lastServiceCost?.services_cost ?? 0
            },
            {
                where: { user_id: userId }
            }
        );

        let updatedDetails;
        if (updatedCount === 0) {
            const createdDetails = await CaregiverDetails.create({
                user_id: userId, ...value, language_speak, background_submitted: true, background_verified: 'pending',
            });
            updatedDetails = createdDetails;
        } else {
            updatedDetails = await CaregiverDetails.findOne({ where: { user_id: userId } });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Documents and Details updated successfully',
            data: updatedDetails
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** add availability -----------------> multiple */
// async function addAvailability(req, res) {
//     try {
//         const schema = Joi.object().keys({
//             week_day: Joi.string().valid('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday').allow('').required(),
//             morning: Joi.object().keys({
//                 morningStartTime: Joi.string().allow(''),
//                 morningEndTime: Joi.string().allow('')
//             }),
//             evening: Joi.object().keys({
//                 eveningStartTime: Joi.string().allow(''),
//                 eveningEndTime: Joi.string().allow('')
//             })
//         });

//         let { value, error } = schema.validate({ ...req.body });
//         if (error) {
//             return res.status(400).json({
//                 status: 'error',
//                 message: 'Invalid request data',
//                 data: {
//                     original: error._object,
//                     details: _.map(error.details, ({ message, type }) => ({
//                         message: message.replace(/['"]/g, ''),
//                         type
//                     }))
//                 }
//             });
//         }

//         let userId = req.userId;
//         let user = await Users.findOne({
//             where: { id: userId, role: 'caregiver' }
//         });
//         console.log("userId", userId, value);
//         if (!user) {
//             return res.status(404).json({
//                 status: 'error',
//                 message: 'Only caregiver can add caregiver availability details.'
//             });
//         }

//         const morningStartTime = value.morning ? value.morning.morningStartTime : '';
//         const morningEndTime = value.morning ? value.morning.morningEndTime : '';
//         const eveningStartTime = value.evening ? value.evening.eveningStartTime : '';
//         const eveningEndTime = value.evening ? value.evening.eveningEndTime : '';


//         if (morningStartTime !== '' && morningEndTime !== '' && eveningStartTime !== '' && eveningEndTime !== '') {

//             console.log('value:----------0 ');
//             const availabilitySlots = generateTimeSlots(morningStartTime, morningEndTime);
//             const availabilitySlots2 = generateTimeSlots(eveningStartTime, eveningEndTime);

//             let all_slot = [...availabilitySlots, ...availabilitySlots2]
//             const unavailableSlots = generateRemainingSlots(all_slot);

//             await NewCaregiverAvailability.update(
//                 {
//                     morning_start_time: morningStartTime,
//                     morning_end_time: morningEndTime,
//                     evening_start_time: eveningStartTime,
//                     evening_end_time: eveningEndTime,
//                     availability_slots: all_slot,
//                     unavailable_slots: unavailableSlots,
//                 },
//                 {
//                     where: { caregiver_id: userId, week_day: value.week_day }
//                 });
//             const availability = await NewCaregiverAvailability.findOne({ where: { caregiver_id: userId, week_day: value.week_day } });
//             console.log(availability);
//             return res.status(200).json({ status: 'success', message: 'Availability data', data: availability });

//         } else if (morningStartTime !== '' && morningEndTime !== '') {
//             const availabilitySlots = generateTimeSlots(morningStartTime, morningEndTime);
//             console.log('availabilitySlots', availabilitySlots);
//             const unavailableSlots = generateRemainingSlots(availabilitySlots);
//             console.log('unavailableSlots: ', unavailableSlots);

//             console.log('value:----------1 ');

//             await NewCaregiverAvailability.update(
//                 {
//                     morning_start_time: morningStartTime,
//                     evening_end_time: morningEndTime,
//                     availability_slots: availabilitySlots,
//                     unavailable_slots: unavailableSlots,
//                 },
//                 {
//                     where: { caregiver_id: userId, week_day: value.week_day }
//                 });
//             const availability = await NewCaregiverAvailability.findOne({ where: { caregiver_id: userId, week_day: value.week_day } });
//             console.log(availability);
//             return res.status(200).json({ status: 'success', message: 'Availability data', data: availability });

//         } else if (eveningStartTime !== '' && eveningEndTime !== '') {

//             const availabilitySlots = generateTimeSlots(eveningStartTime, eveningEndTime);
//             const unavailableSlots = generateRemainingSlots(availabilitySlots);
//             await NewCaregiverAvailability.update(
//                 {
//                     morning_start_time: eveningStartTime,
//                     evening_end_time: eveningEndTime,
//                     availability_slots: availabilitySlots,
//                     unavailable_slots: unavailableSlots,
//                 },
//                 {
//                     where: { caregiver_id: userId, week_day: value.week_day }
//                 });
//             const availability = await NewCaregiverAvailability.findOne({ where: { caregiver_id: userId, week_day: value.week_day } });
//             console.log(availability);
//             return res.status(200).json({ status: 'success', message: 'Availability data', data: availability });

//         } else if (morningEndTime !== '' && eveningStartTime !== '') {
//             console.log('value:----------3 ');

//             const availabilitySlots = generateTimeSlots(morningEndTime, eveningStartTime);
//             const unavailableSlots = generateRemainingSlots(availabilitySlots);


//             await NewCaregiverAvailability.update(
//                 {
//                     morning_start_time: morningEndTime,
//                     evening_end_time: eveningStartTime,
//                     availability_slots: availabilitySlots,
//                     unavailable_slots: unavailableSlots,
//                 },
//                 {
//                     where: { caregiver_id: userId, week_day: value.week_day }
//                 });
//             const availability = await NewCaregiverAvailability.findOne({ where: { caregiver_id: userId, week_day: value.week_day } });
//             console.log(availability);
//             return res.status(200).json({ status: 'success', message: 'Availability data', data: availability });

//         } else if (morningStartTime !== '' && eveningEndTime !== '') {
//             console.log('value:----------4 ');

//             const availabilitySlots = generateTimeSlots(morningStartTime, eveningEndTime);
//             const unavailableSlots = generateRemainingSlots(availabilitySlots);

//             await NewCaregiverAvailability.update(
//                 {
//                     morning_start_time: morningStartTime,
//                     evening_end_time: eveningEndTime,
//                     availability_slots: availabilitySlots,
//                     unavailable_slots: unavailableSlots,
//                 },
//                 {
//                     where: { caregiver_id: userId, week_day: value.week_day }
//                 });
//             const availability = await NewCaregiverAvailability.findOne({ where: { caregiver_id: userId, week_day: value.week_day } });
//             console.log(availability);
//             return res.status(200).json({ status: 'success', message: 'Availability data', data: availability });

//         } else if (morningStartTime !== '' && eveningStartTime !== '') {
//             console.log('value:----------5 ');

//             const availabilitySlots = generateTimeSlots(morningStartTime, eveningStartTime);
//             const unavailableSlots = generateRemainingSlots(availabilitySlots);


//             await NewCaregiverAvailability.update(
//                 {
//                     morning_start_time: morningStartTime,
//                     evening_end_time: eveningStartTime,
//                     availability_slots: availabilitySlots,
//                     unavailable_slots: unavailableSlots,
//                 },
//                 {
//                     where: { caregiver_id: userId, week_day: value.week_day }
//                 });
//             const availability = await NewCaregiverAvailability.findOne({ where: { caregiver_id: userId, week_day: value.week_day } });
//             console.log(availability);
//             return res.status(200).json({ status: 'success', message: 'Availability data', data: availability });

//         } else if (morningEndTime !== '' && eveningEndTime !== '') {
//             const availabilitySlots = generateTimeSlots(morningEndTime, eveningEndTime);
//             const unavailableSlots = generateRemainingSlots(availabilitySlots);

//             await NewCaregiverAvailability.update(
//                 {
//                     morning_start_time: morningEndTime,
//                     evening_end_time: eveningEndTime,
//                     availability_slots: availabilitySlots,
//                     unavailable_slots: unavailableSlots,
//                 },
//                 {
//                     where: { caregiver_id: userId, week_day: value.week_day }
//                 });
//             const availability = await NewCaregiverAvailability.findOne({ where: { caregiver_id: userId, week_day: value.week_day } });
//             console.log(availability);
//             return res.status(200).json({ status: 'success', message: 'Availability data', data: availability });

//         }

//     }
//     catch (error) {
//         console.log('Error :', error || error.message);
//         return res.status(500).json({
//             status: 'error',
//             message: error.message
//         });
//     }
// }

// async function addAvailability(req, res) {
//     try {
//         const schema = Joi.object({
//             week_day: Joi.string().valid('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday').allow('').required(),
//             morning: Joi.object({
//                 morningStartTime: Joi.string().allow(''),
//                 morningEndTime: Joi.string().allow('')
//             }),
//             evening: Joi.object({
//                 eveningStartTime: Joi.string().allow(''),
//                 eveningEndTime: Joi.string().allow('')
//             })
//         });

//         const { value, error } = schema.validate(req.body);
//         if (error) {
//             return res.status(400).json({
//                 status: 'error',
//                 message: 'Invalid request data',
//                 data: {
//                     original: error._object,
//                     details: error.details.map(({ message, type }) => ({
//                         message: message.replace(/['"]/g, ''),
//                         type
//                     }))
//                 }
//             });
//         }

//         const userId = req.userId;
//         const user = await Users.findOne({
//             where: { id: userId, role: 'caregiver' }
//         });
//         if (!user) {
//             return res.status(404).json({
//                 status: 'error',
//                 message: 'Only caregivers can add caregiver availability details.'
//             });
//         }

//         const { morning, evening } = value;
//         const { morningStartTime, morningEndTime } = morning || {};
//         const { eveningStartTime, eveningEndTime } = evening || {};

//         if (morningStartTime && eveningEndTime) {
//             const availabilitySlots = generateTimeSlots(morningStartTime, eveningEndTime);
//             const unavailableSlots = generateTimeSlots(morningEndTime, eveningStartTime);

//             await NewCaregiverAvailability.update(
//                 {
//                     morning_start_time: morningStartTime,
//                     evening_end_time: eveningEndTime,
//                     availability_slots: availabilitySlots,
//                     unavailable_slots: unavailableSlots,
//                 },
//                 {
//                     where: { caregiver_id: userId, week_day: value.week_day }
//                 }
//             );
//         }

//         const availability = await NewCaregiverAvailability.findOne({
//             where: { caregiver_id: userId, week_day: value.week_day }
//         });

//         return res.status(200).json({ status: 'success', message: 'Availability data', data: availability });
//     } catch (error) {
//         console.log('Error:', error || error.message);
//         return res.status(500).json({
//             status: 'error',
//             message: error.message || 'Internal server error'
//         });
//     }
// }

/** add availability */
async function addAvailability(req, res) {
    try {
        // joi schema validation
        const schema = Joi.object().keys({
            week_day: Joi.string().valid('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday').allow('').required(),
            start_time: Joi.string().allow(''),
            end_time: Joi.string().allow(''),
        });

        let { value, error } = schema.validate({ ...req.body });
        if (error) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid request data',
                data: {
                    original: error._object,
                    details: _.map(error.details, ({ message, type }) => ({
                        message: message.replace(/['"]/g, ''),
                        type
                    }))
                }
            });
        }

        let userId = req.userId;
        let user = await Users.findOne({
            where: { id: userId, role: 'caregiver' }
        });

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Only caregiver can add caregiver availability details.'
            });
        }
        const availabilitySlots = generateTimeSlots(value.start_time, value.end_time);
        // const unavailable_slots = generateTimeSlots(value.morningEndTime, value.eveningStartTime);

        await NewCaregiverAvailability.update(
            {
                morning_start_time: value.start_time,
                evening_end_time: value.end_time,
                availability_slots: availabilitySlots,
                // unavailable_slots: unavailable_slots,
            },
            {
                where: { caregiver_id: userId, week_day: value.week_day }
            })
        const availability = await NewCaregiverAvailability.findOne({
            attributes: { exclude: ['morning_end_time', 'evening_start_time'] },
            where: { caregiver_id: userId, week_day: value.week_day }
        })
        console.log(availability);
        return res.status(200).json({ status: 'success', message: 'Availability data', data: availability });
    }
    catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** get availability */
// async function getAvailability(req, res) {
//     try {
//         let userId = req.userId;
//         let user = await Users.findOne({
//             where: { id: userId, role: 'caregiver' }
//         });
//         if (!user) {
//             return res.status(404).json({
//                 status: 'error',
//                 message: 'Only caregiver can view caregiver details.'
//             });
//         }

//         const caregiverAvailabilities = await NewCaregiverAvailability.findAll({
//             where: { caregiver_id: userId },
//             attributes: { exclude: ['availability_slots'] }
//         });

//         return res.status(200).json({
//             status: 'success',
//             message: 'Availability data',
//             data: caregiverAvailabilities
//         });
//     }
//     catch (error) {
//         console.log('Error :', error || error.message);
//         return res.status(500).json({
//             status: 'error',
//             message: error.message
//         });
//     }
// }


async function getAvailability(req, res) {
    try {
        let caregiverId = req.userId;
        let slots;
        let is_holiday = false;
        const { booking_date } = req.query;
        if (!booking_date) {
            return res.status(400).json({ status: 'error', message: 'Booking date is required.' });
        }
        const selectedDate = moment(booking_date).format('YYYY-MM-DD');
        const weekday = getDayFromDate(selectedDate);
        const startDateTime = moment(selectedDate).startOf('day'); // Change to local time

        const holiday = await Holiday.findOne({
            where: {
                [Op.and]: [
                    { holiday_start_date: { [Op.lte]: `${selectedDate}` } },
                    { holiday_end_date: { [Op.gte]: selectedDate } }
                ]
            }
        });
        if (holiday) {
            is_holiday = true;
        }

        const caregiverAvailability = await NewCaregiverAvailability.findOne({
            where: { caregiver_id: caregiverId, week_day: weekday }
        });

        if (!caregiverAvailability || !caregiverAvailability.availability_slots.length) {
            return res.status(400).json({
                status: 'error',
                message: 'No slots available',
                data: {
                    caregiver_id: caregiverId,
                    availability_date: selectedDate,
                    is_holiday: is_holiday,
                    slot: [],
                }
            });
        }
        else {
            const appointments = await AppointmentBooking.findAll({
                where: {
                    caregiver_id: caregiverId,
                    start_appointment: { [Op.between]: [startDateTime.toDate(), moment(startDateTime).endOf('day').toDate()] }
                }
            });

            const bookedSlots = getAppointmentsSlots(appointments);
            const unavailableSlots = await getUnavailableSlots(caregiverId, selectedDate);

            slots = generateAvailabilityStatus(caregiverAvailability.availability_slots, unavailableSlots, caregiverAvailability.unavailable_slots, bookedSlots, selectedDate);

            let pricing = await ServicesCost.findAll({});
            let holidayPrice = pricing.find((p) => p.type === 'holiday')
            let saturdayPrice = pricing.find((p) => p.type === 'saturday')
            let sundayPrice = pricing.find((p) => p.type === 'sunday')

            if (is_holiday && holidayPrice) {
                let stdPrice = pricing.find((p) => p.sub_type === 'standard' && p.type === 'holiday')
                let nstdPrice = pricing.find((p) => p.sub_type === 'nonstandard' && p.type === 'holiday')

                function parseTime(timeString) {
                    const [hours, minutes] = timeString.split(':').map(part => parseInt(part, 10));
                    return hours + (minutes / 60);
                }

                function updatePrices(slots, priceRanges, type) {
                    return slots.map((slot) => {
                        const startTime = parseTime(slot.start_date.split(" ")[1]);
                        // Find the matching price range for the start time
                        const matchingRange = priceRanges.find(range => {
                            const rangeStart = parseTime(range.start);
                            const rangeEnd = parseTime(range.end);

                            if (rangeStart <= rangeEnd) {
                                return startTime >= rangeStart && startTime < rangeEnd;
                            } else {
                                return startTime >= rangeStart || startTime < rangeEnd;
                            }
                        });

                        // If a matching range is found, update prices accordingly
                        if (matchingRange) {
                            slot.price_perhour = Number(matchingRange.price_perhour.toFixed(2));
                            slot.price_perslot = Number((matchingRange.price_perhour / 2).toFixed(2)); // Assuming each slot is 30 minutes
                            slot.type = type;
                        }
                        return { ...slot }
                    });
                }
                if (stdPrice && nstdPrice) {
                    const standardPriceRanges = [
                        { start: stdPrice.start_time, end: stdPrice.end_time, price_perhour: Number(stdPrice.price_perhour) }
                    ];
                    const nonStandardPriceRanges = [
                        { start: nstdPrice.start_time, end: nstdPrice.end_time, price_perhour: Number(nstdPrice.price_perhour) }
                    ];

                    slots = updatePrices(slots, standardPriceRanges, 'standard');
                    slots = updatePrices(slots, nonStandardPriceRanges, 'non-standard');
                }
            } else if (weekday.toLowerCase() === "sunday" && sundayPrice) {
                let stdPrice = pricing.find((p) => p.sub_type === 'standard' && p.type === 'sunday')
                let nstdPrice = pricing.find((p) => p.sub_type === 'nonstandard' && p.type === 'sunday')

                function parseTime(timeString) {
                    const [hours, minutes] = timeString.split(':').map(part => parseInt(part, 10));
                    return hours + (minutes / 60);
                }

                function updatePrices(slots, priceRanges, type) {
                    return slots.map((slot) => {
                        const startTime = parseTime(slot.start_date.split(" ")[1]);
                        // Find the matching price range for the start time
                        const matchingRange = priceRanges.find(range => {
                            const rangeStart = parseTime(range.start);
                            const rangeEnd = parseTime(range.end);

                            if (rangeStart <= rangeEnd) {
                                return startTime >= rangeStart && startTime < rangeEnd;
                            } else {
                                return startTime >= rangeStart || startTime < rangeEnd;
                            }
                        });

                        // If a matching range is found, update prices accordingly
                        if (matchingRange) {
                            slot.price_perhour = Number(matchingRange.price_perhour.toFixed(2));
                            slot.price_perslot = Number((matchingRange.price_perhour / 2).toFixed(2)); // Assuming each slot is 30 minutes
                            slot.type = type;
                        }
                        return { ...slot }
                    });
                }
                if (stdPrice && nstdPrice) {
                    const standardPriceRanges = [
                        { start: stdPrice.start_time, end: stdPrice.end_time, price_perhour: Number(stdPrice.price_perhour) }
                    ];
                    const nonStandardPriceRanges = [
                        { start: nstdPrice.start_time, end: nstdPrice.end_time, price_perhour: Number(nstdPrice.price_perhour) }
                    ];

                    slots = updatePrices(slots, standardPriceRanges, 'standard');
                    slots = updatePrices(slots, nonStandardPriceRanges, 'non-standard');
                }

            } else if (weekday.toLowerCase() === "saturday" && saturdayPrice) {
                let stdPrice = pricing.find((p) => p.sub_type === 'standard' && p.type === 'saturday')
                let nstdPrice = pricing.find((p) => p.sub_type === 'nonstandard' && p.type === 'saturday')

                function parseTime(timeString) {
                    const [hours, minutes] = timeString.split(':').map(part => parseInt(part, 10));
                    return hours + (minutes / 60);
                }

                function updatePrices(slots, priceRanges, type) {
                    return slots.map((slot) => {
                        const startTime = parseTime(slot.start_date.split(" ")[1]);
                        // Find the matching price range for the start time
                        const matchingRange = priceRanges.find(range => {
                            const rangeStart = parseTime(range.start);
                            const rangeEnd = parseTime(range.end);

                            if (rangeStart <= rangeEnd) {
                                return startTime >= rangeStart && startTime < rangeEnd;
                            } else {
                                return startTime >= rangeStart || startTime < rangeEnd;
                            }
                        });

                        // If a matching range is found, update prices accordingly
                        if (matchingRange) {
                            slot.price_perhour = Number(matchingRange.price_perhour.toFixed(2));
                            slot.price_perslot = Number((matchingRange.price_perhour / 2).toFixed(2)); // Assuming each slot is 30 minutes
                            slot.type = type;
                        }
                        return { ...slot }
                    });
                }
                if (stdPrice && nstdPrice) {
                    const standardPriceRanges = [
                        { start: stdPrice.start_time, end: stdPrice.end_time, price_perhour: Number(stdPrice.price_perhour) }
                    ];
                    const nonStandardPriceRanges = [
                        { start: nstdPrice.start_time, end: nstdPrice.end_time, price_perhour: Number(nstdPrice.price_perhour) }
                    ];

                    slots = updatePrices(slots, standardPriceRanges, 'standard');
                    slots = updatePrices(slots, nonStandardPriceRanges, 'non-standard');
                }

            } else {
                let stdPrice = pricing.find((p) => p.type === 'weekday' && p.sub_type === 'standard')
                let nstdPrice = pricing.find((p) => p.type === 'weekday' && p.sub_type === 'nonstandard')

                function parseTime(timeString) {
                    const [hours, minutes] = timeString.split(':').map(part => parseInt(part, 10));
                    return hours + (minutes / 60);
                }

                function updatePrices(slots, priceRanges, type) {
                    return slots.map((slot) => {
                        const startTime = parseTime(slot.start_date.split(" ")[1]);
                        // Find the matching price range for the start time
                        const matchingRange = priceRanges.find(range => {
                            const rangeStart = parseTime(range.start);
                            const rangeEnd = parseTime(range.end);

                            if (rangeStart <= rangeEnd) {
                                return startTime >= rangeStart && startTime < rangeEnd;
                            } else {
                                return startTime >= rangeStart || startTime < rangeEnd;
                            }
                        });

                        // If a matching range is found, update prices accordingly
                        if (matchingRange) {
                            slot.price_perhour = Number(matchingRange.price_perhour.toFixed(2));
                            slot.price_perslot = Number((matchingRange.price_perhour / 2).toFixed(2)); // Assuming each slot is 30 minutes
                            slot.type = type;
                        }
                        return { ...slot }
                    });
                }
                if (stdPrice && nstdPrice) {
                    const standardPriceRanges = [
                        { start: stdPrice.start_time, end: stdPrice.end_time, price_perhour: Number(stdPrice.price_perhour) }
                    ];
                    const nonStandardPriceRanges = [
                        { start: nstdPrice.start_time, end: nstdPrice.end_time, price_perhour: Number(nstdPrice.price_perhour) }
                    ];

                    slots = updatePrices(slots, standardPriceRanges, 'standard');
                    slots = updatePrices(slots, nonStandardPriceRanges, 'non-standard');
                }
            }

            return res.status(200).json({
                status: 'success',
                message: 'Availability data',
                data: {
                    id: caregiverAvailability.id,
                    caregiver_id: caregiverAvailability.caregiver_id,
                    availability_date: selectedDate,
                    weekday: weekday,
                    is_holiday: is_holiday,
                    slot: slots,
                }
            });
        }
    }
    catch (error) {
        console.log('Error:', error || error.message);
        return res.status(500).json({ status: 'error', message: error.message });
    }
}

async function getAvailabilityTime(req, res) {
    try {
        let caregiverId = req.userId;
        const { booking_date } = req.query;
        if (!booking_date) {
            return res.status(400).json({ status: 'error', message: 'Booking date is required.' });
        }
        const selectedDate = moment(booking_date).format('YYYY-MM-DD');
        const weekday = getDayFromDate(selectedDate);

        const caregiverAvailability = await NewCaregiverAvailability.findOne({
            where: { caregiver_id: caregiverId, week_day: weekday }
        });

        if (!caregiverAvailability || caregiverAvailability.availability_slots.length === 0) {
            return res.status(403).json({ status: 'error', message: 'No slot available today' });
        }

        const { availability_slots } = caregiverAvailability;
        const len = availability_slots.length;
        const start_time = availability_slots[0];
        const end_time = availability_slots[len - 1];

        return res.status(200).json({ status: 'success', message: 'Start Time and End Time', weekday, start_time, end_time });

    } catch (error) {
        console.log('Error:', error || error.message);
        return res.status(500).json({ status: 'error', message: error.message });
    }
}

/** add unavailability */
async function unavailability(req, res) {
    try {
        // let caregiverId = req.userId;

        // // check caregiver exist or not
        // let caregiver = await Users.findOne({ where: { id: caregiverId, role: 'caregiver' } });
        // if (!caregiver) { return res.status(404).json({ status: 'error', message: 'Only caregiver can add unavailability.' }); }

        // const { start_date, end_date } = req.body;

        // // Create CaregiverUnavailability record
        // let existingUnavailability = await CaregiverUnavailability.findOne({
        //     where: {
        //         caregiver_id: caregiverId,
        //         start_date: start_date,
        //         end_date: end_date
        //     }
        // });

        // if (existingUnavailability) {
        //     return res.status(400).json({
        //         status: 'error',
        //         message: 'Unavailability already exists for the selected dates.'
        //     });
        // }

        // // Create CaregiverUnavailability record
        // let unavailability = await CaregiverUnavailability.create({ start_date, end_date, caregiver_id: caregiverId });

        // // response
        // return res.status(200).json({ status: 'success', message: 'Unavailability added successfully', data: unavailability });


        let caregiverId = req.userId;

        // Check if caregiver exists
        let caregiver = await Users.findOne({ where: { id: caregiverId, role: 'caregiver' } });
        if (!caregiver) {
            return res.status(404).json({ status: 'error', message: 'Only caregiver can add unavailability.' });
        }

        const { start_date, end_date } = req.body;

        // Function to generate array of date objects between start_date and end_date
        function getDateRange(startDate, endDate) {
            const dates = [];
            let currentDate = new Date(startDate);
            const finalDate = new Date(endDate);

            while (currentDate <= finalDate) {
                dates.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }

            return dates;
        }

        // Generate array of date objects between start_date and end_date
        const dateRange = getDateRange(start_date, end_date);

        // Create array of objects for each day in the date range
        const unavailabilityData = dateRange.map(date => {
            const startDateWithTime = new Date(date);
            startDateWithTime.setUTCHours(new Date(start_date).getUTCHours());
            startDateWithTime.setUTCMinutes(new Date(start_date).getUTCMinutes());
            const endDateWithTime = new Date(date);
            endDateWithTime.setUTCHours(new Date(end_date).getUTCHours());
            endDateWithTime.setUTCMinutes(new Date(end_date).getUTCMinutes());

            return {
                start_date: startDateWithTime.toISOString(),
                end_date: endDateWithTime.toISOString(),
                caregiver_id: caregiverId
            };
        });

        // Create CaregiverUnavailability records
        let createdUnavailabilities = await CaregiverUnavailability.bulkCreate(unavailabilityData);

        // Response
        return res.status(200).json({ status: 'success', message: 'Unavailabilities added successfully', data: createdUnavailabilities });

    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** edit unavailability */
async function editUnavailability(req, res) {
    try {
        let caregiverId = req.userId;
        let unavailabilityId = req.params.id;

        // check caregiver exist or not
        let caregiver = await Users.findOne({ where: { id: caregiverId, role: 'caregiver' } });
        if (!caregiver) { return res.status(404).json({ status: 'error', message: 'Caregiver does not exist.' }); }

        // Create CaregiverUnavailability record
        let unavailability = await CaregiverUnavailability.findOne({ where: { id: unavailabilityId, caregiver_id: caregiverId } });
        if (!unavailability) { return res.status(404).json({ status: 'error', message: 'Unavailability does not exist.' }); }

        const { start_date, end_date } = req.body;

        await CaregiverUnavailability.update({ start_date, end_date }, { where: { id: unavailabilityId, caregiver_id: caregiverId } });

        unavailability = await CaregiverUnavailability.findOne({ where: { id: unavailabilityId, caregiver_id: caregiverId } });

        // response
        return res.status(200).json({ status: 'success', message: 'Unavailability data', data: unavailability });

    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** edit unavailability */
async function deleteUnavailability(req, res) {
    try {
        let caregiverId = req.userId;
        let unavailabilityId = req.params.id;

        // check caregiver exist or not
        let caregiver = await Users.findOne({ where: { id: caregiverId, role: 'caregiver' } });
        if (!caregiver) { return res.status(404).json({ status: 'error', message: 'Caregiver does not exist.' }); }

        // Create CaregiverUnavailability record
        let unavailability = await CaregiverUnavailability.findOne({ where: { id: unavailabilityId, caregiver_id: caregiverId } });
        if (!unavailability) { return res.status(404).json({ status: 'error', message: 'Unavailability does not exist.' }); }

        await CaregiverUnavailability.destroy({ where: { id: unavailabilityId, caregiver_id: caregiverId } });

        // response
        return res.status(200).json({ status: 'success', message: 'Unavailability deleted' });

    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** view unavailability */
async function viewUnavailability(req, res) {
    try {
        let caregiverId = req.userId;

        // check caregiver exist or not
        let caregiver = await Users.findOne({ where: { id: caregiverId, role: 'caregiver' } });
        if (!caregiver) { return res.status(404).json({ status: 'error', message: 'Caregiver does not exist.' }); }

        // Create CaregiverUnavailability record
        let unavailability = await CaregiverUnavailability.findAll({ where: { caregiver_id: caregiverId } });

        // response
        return res.status(200).json({ status: 'success', message: 'Unavailability data', data: unavailability });

    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** appointment booked data */
async function appointmentBookedList(req, res) {
    try {
        let userId = req.userId;

        const { start_appointment, end_appointment, booking_status, page = 1, limit = 10 } = req.query;

        let whereClause = {
            caregiver_id: userId
        };

        if (start_appointment && end_appointment) {
            // Validate date format
            const isValidStartDate = moment(start_appointment, 'YYYY-MM-DD', true).isValid();
            const isValidEndDate = moment(end_appointment, 'YYYY-MM-DD', true).isValid();

            if (!isValidStartDate || !isValidEndDate) {
                return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD.' });
            }

            // Validate end_appointment is greater than start_appointment
            if (moment(end_appointment).isBefore(start_appointment)) {
                return res.status(400).json({ error: 'end_appointment must be greater than start_appointment.' });
            }

            whereClause.start_appointment = {
                [Op.gte]: start_appointment,
                [Op.lt]: moment(end_appointment).add(1, 'day').format('YYYY-MM-DD')
            };

        } else if (start_appointment) {
            // If only start_appointment is provided, fetch data from start_appointment to current_date
            const isValidStartDate = moment(start_appointment, 'YYYY-MM-DD', true).isValid();

            if (!isValidStartDate) {
                return res.status(400).json({ error: 'Invalid date format. Please use YYYY-MM-DD.' });
            }

            whereClause.start_appointment = {
                [Op.gte]: start_appointment
            };
        }

        // Add status filter if selected
        if (booking_status) {
            whereClause.booking_status = booking_status.toLowerCase();
        }

        const { count, rows: bookingData } = await AppointmentBooking.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit, 10),
            offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
            order: [['id', 'DESC']]
        });

        const feedbacks = await Feedback.findAll({
            where: {
                appointment_id: { [Op.in]: bookingData.map(booking => booking.id) }
            }
        });

        const userIds = bookingData.map(booking => booking.booked_by);
        const memberIds = bookingData.map(booking => booking.user_id);
        const caregiverIds = bookingData.map(booking => booking.caregiver_id);

        const [users, caregivers, members, feedbackSummaries] = await Promise.all([
            Users.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'full_name', 'profile_image', 'dob', 'age', 'gender', 'account_status'] }),  // ---> patient details
            Users.findAll({ where: { id: { [Op.in]: caregiverIds } }, attributes: ['id', 'full_name', 'profile_image', 'dob', 'age', 'account_status'] }),   // ---> caregiver details
            PatientMember.findAll({ where: { id: { [Op.in]: memberIds } }, attributes: ['id', 'full_name', 'dob', 'age'] }),   // ----> member details            
        ]);


        const transformedData = await Promise.all(bookingData.map(async (booking) => {
            const user = (booking.booking_for === 'self' || booking.booking_for === 'member') ?
                users.find(u => u.id === booking.booked_by) :
                null;
            const caregiver = caregivers.find(caregiver => caregiver.id === booking.caregiver_id);
            const memberData = members.find(member => member.id === booking.user_id);

            // Fetch feedback data for the current appointment
            const appointmentFeedbacks = feedbacks.filter(feedback => feedback.appointment_id === booking.id);

            let total_feedback = appointmentFeedbacks.length;
            let total_rates = 0;

            for (const feedback of appointmentFeedbacks) {
                total_rates += feedback.rate;
            }

            let avg_rates = total_feedback > 0 ? (Math.round((total_rates / total_feedback) * 2) / 2).toFixed(1) : 0;

            return {
                id: booking.id,
                user_id: booking.user_id,
                patient_full_name: user?.full_name || "",
                patient_profile_image: user?.profile_image || "",
                patient_age: user?.age || "",
                patient_gender: user?.gender || "",
                patient_account_status: user?.account_status || "",

                caregiver_id: booking.caregiver_id,
                caregiver_full_name: caregiver?.full_name || "",
                caregiver_profile_image: caregiver?.profile_image || "",
                caregiver_age: caregiver?.age || "",
                caregiver_account_status: caregiver?.account_status || "",

                member_id: memberData?.id || "",
                member_full_name: memberData?.full_name || "",
                member_dob: memberData?.dob || "",
                member_age: memberData?.age || "",

                booking_for: booking.booking_for,
                booked_by: booking.booked_by,
                start_appointment: booking.start_appointment,
                end_appointment: booking.end_appointment,
                booking_status: booking.booking_status,
                total_hours: booking.total_hours,

                average_rates: avg_rates || 0,
                total_rates: total_rates || 0,
                total_feedback: total_feedback || 0,
                created_at: booking.created_at,
                updated_at: booking.updated_at
            };
        }));

        const totalPages = Math.ceil(count / limit);

        return res.status(200).json({
            status: 'success',
            message: 'Appointment Booked Data',
            data: transformedData,
            pagination: {
                total_documents: count,
                total_pages: totalPages,
                current_page: parseInt(page, 10),
                limit: parseInt(limit, 10),
            },
        });


    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** appointment booked details */
async function appointmentBookedDetails(req, res) {
    try {
        let userId = req.userId;
        let appointmentId = req.params.id;

        const bookingData = await AppointmentBooking.findOne({ where: { id: appointmentId } });

        if (!bookingData) {
            return res.status(404).json({
                status: 'error',
                message: 'Appointment booking not found'
            });
        }

        // Find user details for user_id
        const user = await Users.findOne({
            attributes: { exclude: ['password'] },
            // where: { id: bookingData.user_id }
            where: { id: bookingData.booked_by }
        });


        const condition = await Conditions.findAll({
            where: {
                user_id: bookingData.booked_by
            }
        });

        const specialNeeds = await SpecialNeeds.findAll({
            where: {
                user_id: bookingData.booked_by
            }
        });

        // Find caregiver details for caregiver_id
        const caregiver = await Users.findOne({
            // attributes: ['id', 'full_name', 'profile_image', 'gender', 'dob', 'created_at', 'updated_at'],
            attributes: { exclude: ['password'] },
            where: { id: bookingData.caregiver_id }
        });

        const caregiverDetails = await CaregiverDetails.findOne({
            // attributes: ['id', 'user_id', 'week_hours', 'worker_role', 'work_area', 'experience', 'background_submitted', 'background_verified', 'about', 'language_speak', 'created_at', 'updated_at'],
            where: {
                user_id: bookingData.caregiver_id
            }
        });

        const feedbacks = await Feedback.findAll({
            where: {
                appointment_id: appointmentId
            }
        });

        let total_feedback = feedbacks.length;
        let total_rates = 0;

        for (const feedback of feedbacks) {
            total_rates += feedback.rate;
        }

        let avg_rates = total_feedback > 0 ? total_rates / total_feedback : 0;

        const feedbackData = await FeedbackSummary.findOne({
            where: { caregiver_id: bookingData.caregiver_id }
        });

        const { user_id, booking_for } = bookingData;

        let memberData
        if (booking_for !== 'self') {
            memberData = await PatientMember.findOne({ where: { id: user_id } });
        }

        // Destructure memberData and provide default values
        const data = {
            bookingData,
            patientData: user,
            condition,
            specialNeeds,
            caregiver,
            memberData: memberData ||
            {
                "id": "",
                "user_id": "",
                "full_name": "",
                "dob": "",
                "age": "",
                "gender": "",
                "address1": "",
                "address2": "",
                "city": "",
                "state": "",
                "email": "",
                "mobile_number": "",
                "emergency_mobile_number": "",
                "country": "",
                "pin_code": "",
                "account_status": "",
                "created_at": "",
                "updated_at": "",
            },
            caregiverDetails: caregiverDetails || {
                "id": "",
                "user_id": "",
                "week_hours": "",
                "worker_role": "",
                "work_area": "",
                "background_submitted": "",
                "background_verified": "",
                "language_speak": "",
                "about": "",
                "experience": 0,
                "services_cost": 0,
                "created_at": "",
                "updated_at": "",
            },
            feedbacks,
            average_rates: avg_rates,
            total_feedback: total_feedback,
            // ...(feedbackData ? feedbackData.toJSON() : { average_rates: 0, total_rates: 0, total_feedback: 0 }),
        };

        return res.status(200).json({
            status: 'success',
            message: 'Appointment Booked Data',
            data
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** change booking status */
async function changeAppointmentStatus(req, res) {
    try {
        let userId = req.userId;
        let bookingId = req.params.id;

        let user = await Users.findOne({
            where: { id: userId, role: 'caregiver' }
        });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Only caregiver can change booking status.'
            });
        }

        let { status } = req.body;

        await AppointmentBooking.update({ booking_status: status }, { where: { id: bookingId } });

        return res.status(200).json({ message: `Appointment ${status}`, status: 'success' });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** get feedback */
async function getFeedback(req, res) {
    try {
        const caregiverId = req.userId;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // Fetch total count for pagination
        const totalCount = await Feedback.count({
            where: {
                caregiver_id: caregiverId
            }
        });

        // Fetch feedback data with pagination
        const feedbackData = await Feedback.findAll({
            where: {
                caregiver_id: caregiverId
            },
            order: [['id', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        // Fetch user information for each feedback
        const userIds = feedbackData.map(feedback => feedback.user_id);
        const users = await Users.findAll({ attributes: ['id', 'full_name'], where: { id: userIds } });

        // Fetch feedback summary data
        const feedbackSummaryData = await FeedbackSummary.findOne({ where: { caregiver_id: caregiverId } });

        // Map user information to each feedback
        const feedbackWithUser = feedbackData.map(feedback => ({
            ...feedback.toJSON(),
            reviewed_by: users.find(user => user.id === feedback.user_id)?.full_name || null
        }));

        // Calculate total pages
        const totalPages = Math.ceil(totalCount / limit);

        // Prepare the response
        const responseData = {
            status: 'success',
            message: 'Feedback Data',
            data: {
                feedback: feedbackWithUser,
                feedbackSummary: feedbackSummaryData?.toJSON() || {
                    "id": null,
                    "caregiver_id": caregiverId,
                    "total_feedback": 0,
                    "total_rates": 0,
                    "average_rates": 0,
                    "created_at": null,
                    "updated_at": null
                },
                limit,
                totalCount,
                currentPage: parseInt(page),
                totalPages: totalPages
            }
        };

        return res.status(200).json(responseData);


    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** add About section */
async function addAbout(req, res) {
    try {
        let userId = req.userId;

        let user = await Users.findOne({
            where: { id: userId, role: 'caregiver' }
        });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Only caregiver can add about section.'
            });
        }

        let { about } = req.body;

        await CaregiverDetails.update({ about }, { where: { user_id: userId } });

        return res.status(200).json({ status: 'success', message: `About Section added Successfully`, });

    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** add highlights */
async function addHighlight(req, res) {
    try {
        let caregiverId = req.userId;

        // check caregiver exist or not
        let caregiver = await Users.findOne({ where: { id: caregiverId, role: 'caregiver' } });
        if (!caregiver) { return res.status(404).json({ status: 'error', message: 'Only caregiver can add highlights.' }); }

        // take new highlight from user
        let { highlight } = req.body;

        // add new highlights
        let highlights = await Highlights.create({
            caregiver_id: caregiverId,
            highlight
        });

        // response
        return res.status(200).json({ status: 'success', message: 'Highlights added successfully', data: highlights });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** delete highlights */
async function deleteHighlight(req, res) {
    try {
        let caregiverId = req.userId;
        let highlightId = req.params.id;

        const highlight = await Highlights.findOne({ where: { id: highlightId, caregiver_id: caregiverId } });
        if (!highlight) {
            return res.status(404).json({ status: 'error', message: 'Highlight does not exist.' });
        }
        await highlight.destroy();
        // response
        return res.status(200).json({ status: 'success', message: 'Highlights deleted successfully' });

    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** get highlights */
async function getHighlight(req, res) {
    try {
        let caregiverId = req.userId;

        // check caregiver exist or not
        let caregiver = await Users.findOne({ where: { id: caregiverId, role: 'caregiver' } });
        if (!caregiver) { return res.status(404).json({ status: 'error', message: 'Only caregiver can view highlights.' }); }

        // check highlight exist or not
        let highlight = await Highlights.findAll({ where: { caregiver_id: caregiverId } });

        // response
        return res.status(200).json({ status: 'success', message: 'Highlights data', data: highlight });

    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** add title */
async function addCanAlsoWith(req, res) {
    try {
        let caregiverId = req.userId;

        // check caregiver exist or not
        let caregiver = await Users.findOne({ where: { id: caregiverId, role: 'caregiver' } });
        if (!caregiver) { return res.status(404).json({ status: 'error', message: 'Only caregiver can add Title.' }); }

        // take new highlight from user
        let { title } = req.body;

        // add new highlights
        let newTitle = await CanAlsoWith.create({
            caregiver_id: caregiverId,
            title
        });

        // response
        return res.status(200).json({ status: 'success', message: 'Titile added successfully', data: newTitle });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** delete title */
async function deleteCanAlsoWith(req, res) {
    try {
        let caregiverId = req.userId;
        let titleId = req.params.id;

        const can_also_with = await CanAlsoWith.findOne({ where: { id: titleId, caregiver_id: caregiverId } });
        if (!can_also_with) {
            return res.status(404).json({ status: 'error', message: 'Can_also_with ttile does not exist.' });
        }
        await can_also_with.destroy();
        // response
        return res.status(200).json({ status: 'success', message: 'Can_also_with title deleted successfully' });

    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** update highlights */
async function getCanAlsoWith(req, res) {
    try {
        let caregiverId = req.userId;

        // check caregiver exist or not
        let caregiver = await Users.findOne({ where: { id: caregiverId, role: 'caregiver' } });
        if (!caregiver) { return res.status(404).json({ status: 'error', message: 'Only caregiver can view title.' }); }

        // check highlight exist or not
        let title = await CanAlsoWith.findAll({ where: { caregiver_id: caregiverId } });

        // response
        return res.status(200).json({ status: 'success', message: 'Highlights updated successfully', data: title });

    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** clock in */
async function clockIn(req, res) {
    try {
        let caregiverId = req.userId;
        let appointmentId = req.params.id;

        // check caregiver exist or not
        let caregiver = await Users.findOne({ where: { id: caregiverId, role: 'caregiver' } });
        if (!caregiver) { return res.status(404).json({ status: 'error', message: 'Only caregiver can clock-in.' }); }

        // check caregiver exist or not
        let appointment = await AppointmentBooking.findOne({ where: { id: appointmentId } });
        if (!appointment) { return res.status(404).json({ status: 'error', message: 'There is no appointment for this user' }); }

        // Generate a 4-digit OTP with numeric characters
        const OTP = await generateOTP();

        if (appointment.booking_for == 'member') {
            let userId = appointment.user_id;
            let patientId = appointment.booked_by;

            let member = await PatientMember.findOne({ where: { id: userId } });
            if (!member) { return res.status(404).json({ status: 'error', message: 'Member does not exist.' }); }

            let patient = await Users.findOne({ where: { id: patientId } });
            if (!patient) { return res.status(404).json({ status: 'error', message: 'Patient does not exist.' }); }

            // send otp on email
            await sendEmail(patient.email, 'Clock-In Verification code', `Your clock-in verification code is : ${OTP}`);
            await sendEmail(member.email, 'Clock-In Verification code', `Your clock-in verification code is : ${OTP}`);

            // get otp and insert into otp collection
            await Verifications.create({
                user_id: patientId,
                otp: OTP
            });
        } else {
            let patientId = appointment.booked_by;
            let patient = await Users.findOne({ where: { id: patientId } });
            if (!patient) { return res.status(404).json({ status: 'error', message: 'Patient does not exist.' }); }

            // send otp on email
            await sendEmail(patient.email, 'Clock-In Verification code', `Your clock-in verification code is : ${OTP}`);

            // get otp and insert into otp collection
            await Verifications.create({
                user_id: patientId,
                otp: OTP
            });
        }

        // response
        return res.status(200).json({ status: 'success', message: 'Clock-in OTP sent successfully' });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** clock in */
async function verifyClockIn(req, res) {
    try {
        let caregiverId = req.userId;
        let appointmentId = req.params.id;

        // check caregiver exist or not
        let caregiver = await Users.findOne({ where: { id: caregiverId, role: 'caregiver' } });
        if (!caregiver) { return res.status(404).json({ status: 'error', message: 'Only caregiver can clock-in.' }); }

        let { otp } = req.body;

        // check caregiver exist or not
        let appointment = await AppointmentBooking.findOne({ where: { id: appointmentId } });
        if (!appointment) { return res.status(404).json({ status: 'error', message: 'There is no appointment for this user' }); }

        let patientId = appointment.booked_by;

        // check patient exist or not
        let patient = await Users.findOne({ where: { id: patientId } });
        if (!patient) { return res.status(404).json({ status: 'error', message: 'Patient does not exist.' }); }

        // verify otp
        let isMatch = await Verifications.findOne({ where: { user_id: patientId, otp } });
        if (!isMatch) { return res.status(400).json({ status: 'error', message: 'Please enter valid OTP' }); }

        // delete record from verification table after otp verified
        await Verifications.destroy({
            where: { user_id: patientId }
        });

        // change booking_status after clicking on clock-in button
        await AppointmentBooking.update({ booking_status: 'started' }, { where: { id: appointmentId } });

        // response
        return res.status(200).json({ status: 'success', message: 'Clock-in OTP verified successfully', appointment });

    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** clock in */
async function clockOut(req, res) {
    try {
        let caregiverId = req.userId;
        let appointmentId = req.params.id;

        // check caregiver exist or not
        let caregiver = await Users.findOne({ where: { id: caregiverId, role: 'caregiver' } });
        if (!caregiver) { return res.status(404).json({ status: 'error', message: 'Only caregiver can clock-in.' }); }

        // check patient exist or not
        let appointment = await AppointmentBooking.findOne({ where: { id: appointmentId } });
        if (!appointment) { return res.status(404).json({ status: 'error', message: 'Appointment does not exist.' }); }

        await AppointmentBooking.update({ booking_status: 'finished' }, {
            where: { id: appointmentId },
        });

        // response
        return res.status(200).json({ status: 'success', message: 'Clock-out successfully' });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// caregiver documents
async function documentsData(req, res) {
    try {
        const userId = req.userId;
        let user = await Users.findOne({
            attributes: { exclude: ['password'] },
            where: { id: userId }
        });

        if (!user) return res.status(404).json({ status: 'error', message: 'User does not exist.' });

        let caregiverDetails = null;
        // check if role is caregiver or not        
        if (user.role === 'caregiver') {
            caregiverDetails = await CaregiverDetails.findOne({
                where: { user_id: user.id }
            });
        }

        const data = {
            // ...user.toJSON(),
            ...caregiverDetails.toJSON()
        };

        return res.status(200).json({
            status: 'success',
            message: 'Documents Data',
            data,
        });
    } catch (error) {
        console.log("Error :", error || error.message);
        return res.status(500).json({
            status: "error",
            message: error.message,
        });
    }

}

module.exports = {
    updateCaregiverDetails,
    addAvailability,
    unavailability,
    editUnavailability,
    viewUnavailability,
    deleteUnavailability,

    getAvailability,
    getAvailabilityTime,
    appointmentBookedList,
    appointmentBookedDetails,
    changeAppointmentStatus,
    getFeedback,
    addAbout,

    addHighlight,
    deleteHighlight,
    getHighlight,

    addCanAlsoWith,
    deleteCanAlsoWith,
    getCanAlsoWith,

    clockIn,
    verifyClockIn,
    clockOut,

    documentsData,
};