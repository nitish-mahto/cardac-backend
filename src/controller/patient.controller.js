const _ = require('lodash');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const Users = require('../models/user.model');
const Admin = require('../models/admin.model');
const Conditions = require('../models/condition.model');
const SpecialNeeds = require('../models/special_needs.model');
const PatientMember = require('../models/patient_member.model');
const Verifications = require('../models/verifications.model');
const CareGiverDetails = require('../models/caregiver_details.model');
const AppointmentBooking = require('../models/appointment_booking.model');
const CaregiverDetails = require('../models/caregiver_details.model');
const LanguageSpeak = require('../models/language_speak.model');
const CanAlsoWith = require('../models/can_also_with.model');
const Hightlight = require('../models/highlights.model');
const Services = require('../models/services.model');
const CaregiverAvailability = require('../models/caregiver_availability.model');
const Preferences = require('../models/preference.model');
const Preference = require('../models/preference.model');
const Holiday = require('../models/holiday.model');
const Feedback = require('../models/feedback.model');
const FeedbackSummary = require('../models/feedback_summary.model');
const Referral = require('../models/referral.model');
const { calculateAge, calculateTimeDifference, extractDateWithMoment } = require('../utils/date.utils');
const moment = require('moment');
const { Op } = require('sequelize');
const Highlight = require('../models/highlights.model');
const sendEmail = require('../utils/sendEmail');
const { getDayFromDate, generateAvailabilityStatus, getAppointmentsSlots, getUnavailableSlots, allSlots, getCurrentDate, formatTimeRange } = require('../utils/utils.js');
const CaregiverUnavailability = require('../models/caregiver_unavailability.model');
const NewCaregiverAvailability = require('../models/newCaregiverAvailability.js');
const ServicesCost = require('../models/services_cost.model.js');
const newCaregiverAvailability = require('../models/newCaregiverAvailability.js');

/** add preferences */
async function addPreferences(req, res) {
    try {
        let userId = req.userId;
        const { who_need_care, age, post_code, need_help } = req.body;

        let preferenceData = await Preferences.create({ user_id: userId, who_need_care, age, post_code, need_help });
        await Users.update({ is_preferences_added: true }, { where: { id: userId } });

        return res.status(200).json({ status: 'success', message: 'Preferences added Successfully', data: preferenceData });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** add member */
async function addMemberDetails(req, res) {
    try {
        let userId = req.userId;
        const patient = await Users.findOne({
            where: { id: userId, role: 'patient' }
        });

        if (!patient) return res.status(404).json({ status: 'error', message: 'Only patient can add member details.' });

        const schema = Joi.object({
            full_name: Joi.string()
                .regex(/^[a-zA-Z ]*$/, { name: 'full_name' })
                .trim()
                .required()
                .messages({
                    'string.base': 'Full name should be a type of text',
                    'string.empty': 'Full name cannot be an empty field',
                    'string.pattern.base': 'Only characters are allowed in full_name',
                    'any.required': 'Full name is a required field'
                }),

            email: Joi.string()
                .email({ tlds: { allow: false } })
                .messages({
                    'string.empty': 'Email cannot be an empty field',
                    'string.email': 'Enter a valid email address'
                }),

            gender: Joi.string().trim().required().messages({
                'string.empty': 'Gender cannot be an empty field',
                'any.required': 'Gender is a required field'
            }),
            dob: Joi.string().allow('', null).optional(),
            address1: Joi.string().allow('', null).optional(),
            address2: Joi.string().allow('', null).optional(),
            mobile_number: Joi.string()
                .trim()
                .regex(/^[+0-9 ]{3,15}$/, { name: 'mobile_number' }) // validate a common phone number format
                .allow('', null)
                .optional()
                .messages({
                    'string.pattern.base': 'Invalid mobile number format'
                }),
            emergency_mobile_number: Joi.string()
                .trim()
                .regex(/^[+0-9 ]{3,15}$/, { name: 'emergency_mobile_number' }) // validate a common phone number format
                .allow('', null)
                .optional()
                .messages({
                    'string.pattern.base': 'Invalid emergency_mobile_number number format'
                }),
            country: Joi.string().allow('', null).optional(),
            state: Joi.string().allow('', null).optional(),
            city: Joi.string().allow('', null).optional(),
            pin_code: Joi.string().allow('', null).optional(),
            lat_long: Joi.string().allow('', null).optional(),
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

        const age = calculateAge(value.dob);

        let newMember = await PatientMember.create({ user_id: userId, ...value, age });

        return res.status(200).json({ status: 'success', message: 'Member added Successfully', data: newMember });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** update member */
async function updateMemberDetails(req, res) {
    try {
        let memberId = req.params.id;
        let userId = req.userId;
        const patient = await Users.findOne({ where: { id: userId, role: 'patient' } });
        if (!patient) return res.status(404).json({ status: 'error', message: 'Only patient can update member details.' });

        const member = await PatientMember.findOne({ where: { id: memberId, user_id: userId } });
        if (!member) return res.status(404).json({ status: 'error', message: 'Member does not exist.' });

        const schema = Joi.object().keys({
            full_name: Joi.string()
                .regex(/^[a-zA-Z ]*$/, 'Characters only allowed in full_name')
                .messages({
                    'string.comments': 'Full name should be a type of text'
                })
                .allow('', null),
            email: Joi.string()
                .email()
                .messages({
                    'string.empty': 'email cannot be an empty field'
                })
                .allow('', null),
            gender: Joi.string().allow('', null),
            dob: Joi.string().allow('', null),
            address1: Joi.string().allow('', null),
            address2: Joi.string().allow('', null),
            mobile_number: Joi.string()
                .trim()
                .regex(/^[+0-9 ]{3,15}$/, { name: 'mobile_number' })
                .allow('', null)
                .optional()
                .messages({
                    'string.pattern.base': 'Invalid mobile number format'
                })
                .allow('', null),
            emergency_mobile_number: Joi.string()
                .trim()
                .regex(/^[+0-9 ]{3,15}$/, { name: 'emergency_mobile_number' })
                .allow('', null)
                .optional()
                .messages({
                    'string.pattern.base': 'Invalid mobile number format'
                })
                .allow('', null),
            country: Joi.string().allow('', null),
            state: Joi.string().allow('', null),
            city: Joi.string().allow('', null),
            pin_code: Joi.string().allow('', null),
            lat_long: Joi.string().allow('', null).optional(),
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

        const age = calculateAge(value.dob);
        await PatientMember.update({ ...value, age }, { where: { id: memberId } });
        const memberUpdated = await PatientMember.findOne({ where: { id: memberId } });

        return res.status(200).json({ status: 'success', message: 'Member details updated Successfully', data: memberUpdated });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** get list of members */
async function getMembers(req, res) {
    try {
        let userId = req.userId;
        const patient = await Users.findOne({
            where: { id: userId, role: 'patient' }
        });
        if (!patient) return res.status(404).json({ status: 'error', message: 'Only patient can view member details.' });

        const members = await PatientMember.findAll({ where: { user_id: userId } });

        return res.status(200).json({ status: 'success', message: 'List of members', data: members });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** get member details */
async function getMemberDetails(req, res) {
    try {
        let memberId = req.params.id;
        let userId = req.userId;

        const patient = await Users.findOne({
            where: { id: userId, role: 'patient' }
        });
        if (!patient) return res.status(404).json({ status: 'error', message: 'Only patient can view member details.' });

        const members = await PatientMember.findOne({ where: { id: memberId } });
        if (!members) return res.status(404).json({ status: 'error', message: 'Members does not exist.' });

        return res.status(200).json({ status: 'success', message: 'Members Details', data: members });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** delete member details */
async function deleteMemberDetails(req, res) {
    try {
        let memberId = req.params.id;
        let userId = req.userId;

        const patient = await Users.findOne({
            where: { id: userId, role: 'patient' }
        });
        if (!patient) return res.status(404).json({ status: 'error', message: 'Only patient can delete member details.' });

        // Delete the member associated with the patient
        const deletedRows = await PatientMember.destroy({
            where: { id: memberId, user_id: userId }
        });

        if (deletedRows === 0) return res.status(404).json({ status: 'error', message: 'Member does not exist or is not associated with the patient.' });

        return res.status(200).json({ status: 'success', message: 'Member deleted successfully' });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** add condition */
async function addCondition(req, res) {
    try {
        let userId = req.userId;
        const { conditions } = req.body;

        const newCondition = {
            user_id: userId,
            conditions: conditions
        };

        let conditions_data = await Conditions.create(newCondition);

        return res.status(200).json({ status: 'success', message: 'Condition added Successfully', data: conditions_data });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** get my condition */
async function getCondition(req, res) {
    try {
        let userId = req.userId;
        const conditions = await Conditions.findAll({ where: { user_id: userId } });

        return res.status(200).json({ status: 'success', message: 'Condition data', data: conditions });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** delete member */
async function deleteCondition(req, res) {
    try {
        let conditionId = req.params.id;
        const conditions = await Conditions.findOne({ where: { id: conditionId } });
        if (!conditions) {
            return res.status(404).json({ status: 'error', message: 'conditions does not exist.' });
        }

        // Delete the user account
        await conditions.destroy();

        return res.status(200).json({ status: 'success', message: 'conditions deleted successfully' });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** add Special-needs */
async function addSpecialNeeds(req, res) {
    try {
        let userId = req.userId;
        const { needs } = req.body;

        let newNeeds = {
            user_id: userId,
            needs: needs
        };

        newNeeds = await SpecialNeeds.create(newNeeds);

        return res.status(200).json({ status: 'success', message: 'SpecialNeeds added Successfully', data: newNeeds });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** get Special-needs */
async function getSpecialNeeds(req, res) {
    try {
        let userId = req.userId;
        const needs_data = await SpecialNeeds.findAll({ where: { user_id: userId } });

        return res.status(200).json({ status: 'success', message: 'SpecialNeeds data', data: needs_data });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** delete Special-Needs */
async function deleteSpecialNeeds(req, res) {
    try {
        let needsId = req.params.id;

        const needs_data = await SpecialNeeds.findOne({ where: { id: needsId } });
        if (!needs_data) {
            return res.status(404).json({ status: 'error', message: 'needs does not exist.' });
        }

        // Delete the user account
        await needs_data.destroy();

        return res.status(200).json({ status: 'success', message: 'SpecialNeeds deleted successfully' });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** list of caregiver */
async function caregiver(req, res) {
    try {
        let userId = req.userId;
        const patient = await Users.findOne({
            where: { id: userId, role: 'patient' }
        });

        if (!patient) {
            return res.status(404).json({ status: 'error', message: 'Only patients can view the list of caregivers.' });
        }

        const { page = 1, limit = 10, language, worker_role, services, average_rates, gender, experience, highlight, can_also_with, city, availability_date } = req.query;
        const offset = (page - 1) * limit;

        // Check if language is set to "all"
        const selectedLanguages = language && language.toLowerCase() !== 'all' ? language.split(',') : [];
        const selectedExperience = experience && experience.toLowerCase() !== 'all' ? experience.split('-') : [];
        let minExp = selectedExperience && selectedExperience.length >= 1 ? selectedExperience[0] : null;
        let maxExp = selectedExperience && selectedExperience.length >= 2 ? selectedExperience[1] : null;

        let selectedWorkerRoles = worker_role && worker_role.toLowerCase() !== 'all' ? worker_role : null;

        if (selectedWorkerRoles == 'Student' || selectedWorkerRoles == 'student' || selectedWorkerRoles == 'Casual' || selectedWorkerRoles == 'casual') {
            selectedWorkerRoles = selectedWorkerRoles.toLowerCase();
        }

        const caregiverDetails = await CareGiverDetails.findAll({
            attributes: ['user_id', 'week_hours', 'qualification', 'worker_role', 'work_area', 'about', 'experience', 'language_speak', 'services_cost', 'created_at', 'background_submitted', 'background_verified'],
            where: {
                background_verified: 'approved',
                ...(minExp !== null && maxExp !== null && { experience: { [Op.between]: [parseFloat(minExp), parseFloat(maxExp)] } }),
            }
        });


        const caregiverIds = caregiverDetails
            .filter(detail =>
                // (!selectedLanguages.length || selectedLanguages.some(lang => detail.language_speak.includes(lang))) &&
                (!selectedLanguages.length || (detail.language_speak && selectedLanguages.some(lang => detail.language_speak.includes(lang)))) &&
                (!selectedWorkerRoles || detail.worker_role === selectedWorkerRoles)
            )
            .map(detail => detail.user_id);


        // ! currently on availability date filter not work
        // let availability = null;

        // if (availability_date) {
        //     availability = await CaregiverAvailability.findAll({
        //         where: {
        //             availability_date: {
        //                 [Op.gte]: `${availability_date} 00:00:00`,
        //                 [Op.lt]: `${availability_date} 23:59:59`,
        //             },
        //             caregiver_id: {
        //                 [Op.in]: caregiverIds
        //             }
        //         }
        //     });

        //     // Parse the JSON in the 'slot' field
        //     availability = availability.map(item => {
        //         return {
        //             ...item.toJSON(),
        //             slot: JSON.parse(item.slot)  // Parse the 'slot' string to an array of objects
        //         };
        //     });
        // }

        let feedbackData;
        // filter from average rates        
        if (average_rates) {
            feedbackData = await FeedbackSummary.findAll({
                where: {
                    caregiver_id: caregiverIds,
                    average_rates: { [Op.gte]: average_rates }
                }
            });
        }

        let highlightData;
        // filter from highlight        
        if (highlight && caregiverIds.length > 0) {
            const highlightArray = highlight.split(',').map(value => value.trim());

            if (highlightArray.length > 0) {
                highlightData = await Hightlight.findAll({
                    where: {
                        caregiver_id: caregiverIds,
                        highlight: {
                            [Op.or]: highlightArray.map(value => ({
                                [Op.like]: `%${value}%`
                            }))
                        }
                    }
                });
            }
        }

        let canAlsoWithData;
        // filter from can_also_with
        if (can_also_with && caregiverIds.length > 0) {
            const canAlsoWithArray = can_also_with.split(',').map(value => value.trim());

            if (canAlsoWithArray.length > 0) {
                canAlsoWithData = await CanAlsoWith.findAll({
                    where: {
                        caregiver_id: caregiverIds,
                        title: {
                            [Op.or]: canAlsoWithArray.map(value => ({
                                [Op.like]: `%${value}%`
                            }))
                        }
                    }
                });
            }
        }

        // Check if Feedback parameter is provided
        const whereCondition = {
            id: average_rates ? feedbackData.map(data => data.caregiver_id) : caregiverIds,
            role: 'caregiver',
        };

        // Add services filter if selected
        if (services) {
            const serviceOptions = services.toLowerCase().split(',').sort();
            whereCondition.services = {
                [Op.or]: serviceOptions.map(service => ({
                    [Op.like]: `%${service}%`
                }))
            };
        }

        // Add gender filter if selected
        if (gender) {
            const genderOptions = gender.toLowerCase().split(',');
            if (genderOptions.includes('female') || genderOptions.includes('male') || genderOptions.includes('other')) {
                whereCondition.gender = {
                    [Op.or]: genderOptions.map(g => ({ [Op.eq]: g }))
                };
            }
        }

        // Add highlight filter if available
        if (highlightData) {
            whereCondition.id = {
                [Op.in]: highlightData.map(data => data.caregiver_id)
            };
        }

        // Add can_also_with filter if available
        if (canAlsoWithData) {
            whereCondition.id = {
                [Op.in]: canAlsoWithData.map(data => data.caregiver_id)
            };
        }

        // Add city filter if available        
        if (city) {
            const cityOptions = city.split(',').sort();
            whereCondition.city = {
                [Op.or]: cityOptions.map(city => ({
                    [Op.like]: `%${city}%`
                }))
            };
        }

        whereCondition.account_status = {
            [Op.ne]: 'suspend'
        };


        // find out data from Users table...
        const caregivers = await Users.findAll({
            attributes: { exclude: ['password'] },
            where: whereCondition,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['id', 'DESC']]
        });


        const caregiverIdsForFeedback = caregivers.map(caregiver => caregiver.id);

        const feedbackSummaries = await FeedbackSummary.findAll({
            where: { caregiver_id: caregiverIdsForFeedback },
        });


        let todayDate = getCurrentDate();
        const selectedDate = moment(todayDate).format('YYYY-MM-DD');
        const weekday = getDayFromDate(selectedDate);

        let standard_services_cost = 0;
        let nonstandard_services_cost = 0;
        if (weekday === 'saturday') {
            standard_services_cost = await ServicesCost.findOne({ where: { type: 'saturday', sub_type: 'standard' } });
            nonstandard_services_cost = await ServicesCost.findOne({ where: { type: 'saturday', sub_type: 'nonstandard' } });
        } else if (weekday === 'sunday') {
            standard_services_cost = await ServicesCost.findOne({ where: { type: 'sunday', sub_type: 'standard' } });
            nonstandard_services_cost = await ServicesCost.findOne({ where: { type: 'sunday', sub_type: 'nonstandard' } });
        } else {
            // services_cost = await ServicesCost.findAll({ where: { type: 'weekday' } });
            standard_services_cost = await ServicesCost.findOne({ where: { type: 'weekday', sub_type: 'standard' } });
            nonstandard_services_cost = await ServicesCost.findOne({ where: { type: 'weekday', sub_type: 'nonstandard' } });
        }

        let todayServiceCost = standard_services_cost.price_perhour + '-' + nonstandard_services_cost.price_perhour;

        const data = caregivers.map((caregiver) => {
            const caregiverDetail = caregiverDetails.find((detail) => detail.user_id === caregiver.id) || {};
            const feedbackSummary = feedbackSummaries.find((summary) => summary.caregiver_id === caregiver.id) || {};
            return {
                ...caregiver.toJSON(),
                week_hours: caregiverDetail.week_hours || "",
                qualification: caregiverDetail.qualification || "",
                worker_role: caregiverDetail.worker_role || "",
                work_area: caregiverDetail.work_area || "",
                experience: caregiverDetail.experience || 0,
                services_cost: todayServiceCost || "",
                language_speak: caregiverDetail.language_speak || "",
                about: caregiverDetail.about || "",
                background_submitted: caregiverDetail.background_submitted || false,
                background_verified: caregiverDetail.background_verified || 'pending',
                details_created_at: caregiverDetail.created_at || "",
                average_rates: feedbackSummary.average_rates || 0,
                total_rates: feedbackSummary.total_rates || 0,
                total_feedback: feedbackSummary.total_feedback || 0
            };
        });

        return res.status(200).json({
            status: 'success',
            message: 'List of caregivers',
            data,
            page,
            limit,
            totalCount: caregivers.length,
            totalPages: Math.ceil(caregivers.length / limit)
        });

    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** get member details */
async function caregiverDetails(req, res) {
    try {
        let caregiverId = req.params.id;
        let userId = req.userId;

        const patient = await Users.findOne({
            where: { id: userId, role: 'patient' }
        });

        if (!patient) return res.status(404).json({ status: 'error', message: 'Only patient can view caregiver details.' });

        const caregiver = await Users.findOne({
            where: {
                id: caregiverId,
                account_status: {
                    [Op.ne]: 'suspended'
                }
            }
        });
        if (!caregiver) return res.status(404).json({ status: 'error', message: 'Caregiver does not exist.' });

        // fetch addition fields of caregiver from caregiver details
        let caregiverDetails = await CareGiverDetails.findOne({
            attributes: ['user_id', 'week_hours', 'qualification', 'worker_role', 'work_area', 'experience', 'about', 'language_speak', 'services_cost', 'about', 'created_at', 'background_submitted', 'background_verified'],
            where: { user_id: caregiver.id }
        });

        const feedbackData = await FeedbackSummary.findOne({
            where: { caregiver_id: caregiver.id }
        });

        let highlights = await Highlight.findAll({
            attributes: ['caregiver_id', 'highlight'],
            where: { caregiver_id: caregiver.id }
        });

        // Map the highlights array to get an array of objects
        const highlightData = highlights.map(highlight => ({
            highlight: highlight.highlight
        }));


        let can_also_with = await CanAlsoWith.findAll({
            attributes: ['caregiver_id', 'title'],
            where: { caregiver_id: caregiver.id }
        });

        let todayDate = getCurrentDate();
        const selectedDate = moment(todayDate).format('YYYY-MM-DD');
        const weekday = getDayFromDate(selectedDate);

        let standard_services_cost = 0;
        let nonstandard_services_cost = 0;
        if (weekday === 'saturday') {
            standard_services_cost = await ServicesCost.findOne({ where: { type: 'saturday', sub_type: 'standard' } });
            nonstandard_services_cost = await ServicesCost.findOne({ where: { type: 'saturday', sub_type: 'nonstandard' } });
        } else if (weekday === 'sunday') {
            standard_services_cost = await ServicesCost.findOne({ where: { type: 'sunday', sub_type: 'standard' } });
            nonstandard_services_cost = await ServicesCost.findOne({ where: { type: 'sunday', sub_type: 'nonstandard' } });
        } else {
            standard_services_cost = await ServicesCost.findOne({ where: { type: 'weekday', sub_type: 'standard' } });
            nonstandard_services_cost = await ServicesCost.findOne({ where: { type: 'weekday', sub_type: 'nonstandard' } });
        }

        let todayServiceCost = '$' + standard_services_cost.price_perhour + '-$' + nonstandard_services_cost.price_perhour;

        const availability = await newCaregiverAvailability.findOne({ where: { caregiver_id: caregiverId, week_day: weekday } });
        let totalAvailabilityLen = availability.availability_slots.length;
        let todayAvailabilityStartTime = null;
        let todayAvailabilityEndTime = null;

        if (totalAvailabilityLen <= 0) {
            todayAvailabilityStartTime = 'No slot available today.';
        } else {
            todayAvailabilityStartTime = formatTimeRange(availability.availability_slots)
        }
        console.log('availability.availability_slots: -------->', availability.availability_slots);

        // Map the can_also_with array to get an array of objects
        const canAlsoWithData = can_also_with.map(item => ({
            title: item.title
        }));

        const data = {
            ...caregiver.toJSON(),
            ...(feedbackData ? feedbackData.toJSON() : { average_rates: 0, total_rates: 0, total_feedback: 0 }),
            ...(caregiverDetails ? { ...caregiverDetails.toJSON(), details_created_at: caregiverDetails.created_at, services_cost: todayServiceCost, todayDate, todayAvailabilityStartTime, todayAvailabilityEndTime } : { details_created_at: null }),
            highlight: highlightData,
            canAlsoWith: canAlsoWithData,
        };


        // Remove the original created_at property
        delete data.created_at;

        return res.status(200).json({ status: 'success', message: 'Caregiver Details', data });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// /** get availability */
// async function getAvailability(req, res) {
//     try {
//         let slots;
//         let is_holiday = false;
//         const { booking_date } = req.query;
//         if (!booking_date) {
//             return res.status(400).json({ status: 'error', message: 'Booking date is required.' });
//         }
//         const selectedDate = moment(booking_date).format('YYYY-MM-DD');
//         const weekday = getDayFromDate(selectedDate);
//         const startDateTime = moment(selectedDate).startOf('day'); // Change to local time

//         const holiday = await Holiday.findOne({
//             where: {
//                 [Op.and]: [
//                     { holiday_start_date: { [Op.lte]: `${selectedDate}` } },
//                     { holiday_end_date: { [Op.gte]: selectedDate } }
//                 ]
//             }
//         });
//         if (holiday) {
//             is_holiday = true;
//         }

//         const caregiverAvailability = await NewCaregiverAvailability.findOne({
//             where: { caregiver_id: req.params.id, week_day: weekday }
//         });

//         if (!caregiverAvailability || !caregiverAvailability.availability_slots.length) {
//             return res.status(400).json({
//                 status: 'error',
//                 message: 'No slots available',
//                 data: {
//                     caregiver_id: req.params.id,
//                     availability_date: selectedDate,
//                     is_holiday: is_holiday,
//                     slot: [],
//                 }
//             });
//         }
//         else {
//             const appointments = await AppointmentBooking.findAll({
//                 where: {
//                     caregiver_id: req.params.id,
//                     start_appointment: { [Op.between]: [startDateTime.toDate(), moment(startDateTime).endOf('day').toDate()] }
//                 }
//             });

//             const bookedSlots = getAppointmentsSlots(appointments);
//             const unavailableSlots = await getUnavailableSlots(req.params.id, selectedDate);

//             slots = generateAvailabilityStatus(caregiverAvailability.availability_slots, unavailableSlots, caregiverAvailability.unavailable_slots, bookedSlots, selectedDate);

//             let pricing = await ServicesCost.findAll({});
//             let holidayPrice = pricing.find((p) => p.type === 'holiday')
//             let saturdayPrice = pricing.find((p) => p.type === 'saturday')
//             let sundayPrice = pricing.find((p) => p.type === 'sunday')

//             if (is_holiday && holidayPrice) {
//                 let stdPrice = pricing.find((p) => p.sub_type === 'standard' && p.type === 'holiday')
//                 let nstdPrice = pricing.find((p) => p.sub_type === 'nonstandard' && p.type === 'holiday')

//                 function parseTime(timeString) {
//                     const [hours, minutes] = timeString.split(':').map(part => parseInt(part, 10));
//                     return hours + (minutes / 60);
//                 }

//                 function updatePrices(slots, priceRanges) {
//                     return slots.map((slot) => {
//                         const startTime = parseTime(slot.start_date.split(" ")[1]);
//                         // Find the matching price range for the start time
//                         const matchingRange = priceRanges.find(range => {
//                             const rangeStart = parseTime(range.start);
//                             const rangeEnd = parseTime(range.end);

//                             if (rangeStart <= rangeEnd) {
//                                 return startTime >= rangeStart && startTime < rangeEnd;
//                             } else {
//                                 return startTime >= rangeStart || startTime < rangeEnd;
//                             }
//                         });

//                         // If a matching range is found, update prices accordingly
//                         if (matchingRange) {
//                             slot.price_perhour = Number(matchingRange.price_perhour.toFixed(2));
//                             slot.price_perslot = Number((matchingRange.price_perhour / 2).toFixed(2)); // Assuming each slot is 30 minutes
//                         }
//                         return { ...slot }
//                     });
//                 }

//                 if (stdPrice && nstdPrice) {
//                     const priceRanges = [
//                         { start: stdPrice.start_time, end: stdPrice.end_time, price_perhour: Number(stdPrice.price_perhour) },
//                         { start: nstdPrice.start_time, end: nstdPrice.end_time, price_perhour: Number(nstdPrice.price_perhour) },
//                     ];

//                     slots = updatePrices(slots, priceRanges)
//                 }
//             } else if (weekday.toLowerCase() === "sunday" && sundayPrice) {
//                 let stdPrice = pricing.find((p) => p.sub_type === 'standard' && p.type === 'sunday')
//                 let nstdPrice = pricing.find((p) => p.sub_type === 'nonstandard' && p.type === 'sunday')

//                 function parseTime(timeString) {
//                     const [hours, minutes] = timeString.split(':').map(part => parseInt(part, 10));
//                     return hours + (minutes / 60);
//                 }

//                 function updatePrices(slots, priceRanges) {
//                     return slots.map((slot) => {
//                         const startTime = parseTime(slot.start_date.split(" ")[1]);
//                         // Find the matching price range for the start time
//                         const matchingRange = priceRanges.find(range => {
//                             const rangeStart = parseTime(range.start);
//                             const rangeEnd = parseTime(range.end);

//                             if (rangeStart <= rangeEnd) {
//                                 return startTime >= rangeStart && startTime < rangeEnd;
//                             } else {
//                                 return startTime >= rangeStart || startTime < rangeEnd;
//                             }
//                         });

//                         // If a matching range is found, update prices accordingly
//                         if (matchingRange) {
//                             slot.price_perhour = Number(matchingRange.price_perhour.toFixed(2));
//                             slot.price_perslot = Number((matchingRange.price_perhour / 2).toFixed(2)); // Assuming each slot is 30 minutes
//                         }
//                         return { ...slot }
//                     });
//                 }

//                 if (stdPrice && nstdPrice) {
//                     const priceRanges = [
//                         { start: stdPrice.start_time, end: stdPrice.end_time, price_perhour: Number(stdPrice.price_perhour) },
//                         { start: nstdPrice.start_time, end: nstdPrice.end_time, price_perhour: Number(nstdPrice.price_perhour) },
//                     ];

//                     slots = updatePrices(slots, priceRanges)
//                 }

//             } else if (weekday.toLowerCase() === "saturday" && saturdayPrice) {
//                 let stdPrice = pricing.find((p) => p.sub_type === 'standard' && p.type === 'saturday')
//                 let nstdPrice = pricing.find((p) => p.sub_type === 'nonstandard' && p.type === 'saturday')

//                 function parseTime(timeString) {
//                     const [hours, minutes] = timeString.split(':').map(part => parseInt(part, 10));
//                     return hours + (minutes / 60);
//                 }

//                 function updatePrices(slots, priceRanges) {
//                     return slots.map((slot) => {
//                         const startTime = parseTime(slot.start_date.split(" ")[1]);
//                         // Find the matching price range for the start time
//                         const matchingRange = priceRanges.find(range => {
//                             const rangeStart = parseTime(range.start);
//                             const rangeEnd = parseTime(range.end);

//                             if (rangeStart <= rangeEnd) {
//                                 return startTime >= rangeStart && startTime < rangeEnd;
//                             } else {
//                                 return startTime >= rangeStart || startTime < rangeEnd;
//                             }
//                         });

//                         // If a matching range is found, update prices accordingly
//                         if (matchingRange) {
//                             slot.price_perhour = Number(matchingRange.price_perhour.toFixed(2));
//                             slot.price_perslot = Number((matchingRange.price_perhour / 2).toFixed(2)); // Assuming each slot is 30 minutes
//                         }
//                         return { ...slot }
//                     });
//                 }

//                 if (stdPrice && nstdPrice) {
//                     const priceRanges = [
//                         { start: stdPrice.start_time, end: stdPrice.end_time, price_perhour: Number(stdPrice.price_perhour) },
//                         { start: nstdPrice.start_time, end: nstdPrice.end_time, price_perhour: Number(nstdPrice.price_perhour) },
//                     ];

//                     slots = updatePrices(slots, priceRanges)
//                 }

//             } else {
//                 let stdPrice = pricing.find((p) => p.type === 'weekday' && p.sub_type === 'standard')
//                 let nstdPrice = pricing.find((p) => p.type === 'weekday' && p.sub_type === 'nonstandard')

//                 function parseTime(timeString) {
//                     const [hours, minutes] = timeString.split(':').map(part => parseInt(part, 10));
//                     return hours + (minutes / 60);
//                 }

//                 function updatePrices(slots, priceRanges) {
//                     return slots.map((slot) => {
//                         const startTime = parseTime(slot.start_date.split(" ")[1]);
//                         // Find the matching price range for the start time
//                         const matchingRange = priceRanges.find(range => {
//                             const rangeStart = parseTime(range.start);
//                             const rangeEnd = parseTime(range.end);

//                             if (rangeStart <= rangeEnd) {
//                                 return startTime >= rangeStart && startTime < rangeEnd;
//                             } else {
//                                 return startTime >= rangeStart || startTime < rangeEnd;
//                             }
//                         });

//                         // If a matching range is found, update prices accordingly
//                         if (matchingRange) {
//                             slot.price_perhour = Number(matchingRange.price_perhour.toFixed(2));
//                             slot.price_perslot = Number((matchingRange.price_perhour / 2).toFixed(2)); // Assuming each slot is 30 minutes
//                         }
//                         return { ...slot }
//                     });
//                 }

//                 if (stdPrice && nstdPrice) {
//                     const priceRanges = [
//                         { start: stdPrice.start_time, end: stdPrice.end_time, price_perhour: Number(stdPrice.price_perhour) },
//                         { start: nstdPrice.start_time, end: nstdPrice.end_time, price_perhour: Number(nstdPrice.price_perhour) },
//                     ];

//                     slots = updatePrices(slots, priceRanges)
//                 }
//             }

//             return res.status(200).json({
//                 status: 'success',
//                 message: 'Availability data',
//                 data: {
//                     id: caregiverAvailability.id,
//                     caregiver_id: caregiverAvailability.caregiver_id,
//                     availability_date: selectedDate,
//                     weekday: weekday,
//                     is_holiday: is_holiday,
//                     slot: slots,
//                 }
//             });
//         }
//     }
//     catch (error) {
//         console.log('Error:', error || error.message);
//         return res.status(500).json({ status: 'error', message: error.message });
//     }
// }

async function getAvailability(req, res) {
    try {
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
            where: { caregiver_id: req.params.id, week_day: weekday }
        });

        if (!caregiverAvailability || !caregiverAvailability.availability_slots.length) {
            return res.status(400).json({
                status: 'error',
                message: 'No slots available',
                data: {
                    caregiver_id: req.params.id,
                    availability_date: selectedDate,
                    is_holiday: is_holiday,
                    slot: [],
                }
            });
        }
        else {
            const appointments = await AppointmentBooking.findAll({
                where: {
                    caregiver_id: req.params.id,
                    start_appointment: { [Op.between]: [startDateTime.toDate(), moment(startDateTime).endOf('day').toDate()] }
                }
            });

            const bookedSlots = getAppointmentsSlots(appointments);
            const unavailableSlots = await getUnavailableSlots(req.params.id, selectedDate);

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

/** book appointment */
async function appointmentBooking(req, res) {
    try {
        // fetch patient id with the help of token and store into userId variable
        let userId = req.userId;
        let caregiverId = req.params.id;

        // check caregiverId is valid id or not(check caregiver details form caregiverId)
        let caregiverExist = await CareGiverDetails.findOne({ where: { user_id: caregiverId } })

        // if not exist then
        if (!caregiverExist) {
            return res.status(404).json({ status: 'error', message: 'Appointment book only on caregiver' });
        }

        // body payload information
        const { start_appointment, end_appointment, booking_for, memberId } = req.body;

        // find date from date object
        const startDate = extractDateWithMoment(start_appointment);
        const endDate = extractDateWithMoment(end_appointment);

        // check appointment booking date is same 
        if (startDate !== endDate) return res.status(403).json({ status: 'error', message: `Appointment can't be booked for multiple days` });

        // validate start_appointment must be greater than end_appointment
        if (start_appointment >= end_appointment) return res.status(403).json({ status: 'error', message: 'Start appointment must be greater than end appointment' });

        // if appointment book for member then store 
        if (booking_for !== 'self') {
            userId = memberId;

            // check memberId is valid id or not(check member details form userId --> memberId)
            let memberExist = await PatientMember.findOne({ where: { id: userId } })

            // if member not exist then
            if (!memberExist) {
                return res.status(404).json({ status: 'error', message: 'Member does not exist.' });
            }
        }

        // calculate dime difference
        const timeDifference = calculateTimeDifference(start_appointment, end_appointment);

        // find service cost of caregiver
        const hourlyCost = await caregiverExist.services_cost;

        // calculate total payment
        const total_cost = parseFloat((hourlyCost * timeDifference).toFixed(2));

        // Store new appointment data into AppointmentBooking table
        const newAppointmentBooking = await AppointmentBooking.create({
            user_id: userId,
            booked_by: req.userId,
            caregiver_id: caregiverId,
            start_appointment,
            end_appointment,
            total_hours: timeDifference,
            total_cost,
            booking_for,
        });


        // store appointment booking id into session
        req.session.appointmentBooking_id = newAppointmentBooking.id;

        // Fetch caregiver availability
        let availability = await CaregiverAvailability.findAll({
            where: { caregiver_id: caregiverId }
        });

        // Parse the JSON in the 'slot' field
        availability = availability.map(item => ({
            ...item.toJSON(),
            slot: JSON.parse(item.slot)
        }));

        // Iterate through each availability slot
        for (const entry of availability) {
            for (const slot of entry.slot) {
                const slotStart = new Date(slot.start_date).getTime();
                const slotEnd = new Date(slot.end_date).getTime();
                const apptStart = new Date(start_appointment).getTime();
                const apptEnd = new Date(end_appointment).getTime();

                // Check if appointment overlaps with the current slot
                if ((apptStart >= slotStart && apptStart < slotEnd) ||
                    (apptEnd > slotStart && apptEnd <= slotEnd) ||
                    (apptStart <= slotStart && apptEnd >= slotEnd)) {
                    // Update availability to false and status to 'unavailability'
                    slot.availability = false;
                    slot.status = 'unavailability';
                }
            }
        }

        // Save the updated availability back to the database (assuming Sequelize model)
        for (const entryToUpdate of availability) {
            await CaregiverAvailability.update(
                { slot: JSON.stringify(entryToUpdate.slot) },
                { where: { id: entryToUpdate.id } }
            );
        }

        // Response after appointment booking
        return res.status(200).json({
            status: 'success',
            message: 'Appointment Booked Successfully',
            data: newAppointmentBooking
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** appointment booked list/data */
async function appointmentBookedList(req, res) {
    try {
        let userId = req.userId;

        const { start_appointment, end_appointment, booking_status, page = 1, limit = 10 } = req.query;

        let whereClause = {
            booked_by: userId
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
            // If only start_date is provided, fetch data from start_appointment to current_date
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
            order: [['created_at', 'DESC']],
            limit: parseInt(limit, 10),
            offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
        });

        const userIds = bookingData.map(booking => booking.user_id);
        const caregiverIds = bookingData.map(booking => booking.caregiver_id);

        const [users, caregivers, members, feedbackSummaries] = await Promise.all([
            Users.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'full_name', 'profile_image', 'dob', 'age', 'gender', 'mobile_number', 'emergency_mobile_number', 'account_status'] }),
            Users.findAll({ where: { id: { [Op.in]: caregiverIds } }, attributes: ['id', 'full_name', 'profile_image', 'dob', 'age', 'mobile_number', 'emergency_mobile_number', 'account_status'] }),
            PatientMember.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'full_name', 'dob', 'age'] }),
            FeedbackSummary.findAll({ where: { caregiver_id: { [Op.in]: caregiverIds } }, attributes: ['id', 'caregiver_id', 'average_rates', 'total_rates', 'total_feedback'] }),
        ]);

        const transformedData = await Promise.all(bookingData.map(async (booking) => {
            const user = users.find(user => user.id === booking.user_id);
            const caregiver = caregivers.find(caregiver => caregiver.id === booking.caregiver_id);
            const memberData = members.find(member => member.id === booking.user_id);
            const feedbackData = feedbackSummaries.find(feedback => feedback.caregiver_id === booking.caregiver_id);

            return {
                id: booking.id,
                user_id: booking.user_id,
                patient_full_name: user?.full_name || null,
                patient_profile_image: user?.profile_image || null,
                patient_age: user?.age || null,
                patient_gender: user?.gender || null,
                patient_mobile_number: user?.mobile_number || null,
                patient_emergency_mobile_number: user?.emergency_mobile_number || null,
                patient_account_status: user?.account_status,

                caregiver_id: booking.caregiver_id,
                caregiver_full_name: caregiver?.full_name || null,
                caregiver_profile_image: caregiver?.profile_image || null,
                caregiver_age: caregiver?.age || null,
                caregiver_mobile_number: caregiver?.mobile_number || null,
                caregiver_emergency_mobile_number: caregiver?.emergency_mobile_number || null,
                caregiver_account_status: caregiver?.account_status || null,

                member_id: memberData?.id || null,
                member_full_name: memberData?.full_name || null,
                member_dob: memberData?.dob || null,
                member_age: memberData?.age || null,

                booking_for: booking.booking_for,
                booked_by: booking.booked_by,
                start_appointment: booking.start_appointment,
                end_appointment: booking.end_appointment,
                booking_status: booking.booking_status,
                total_hours: booking.total_hours,
                total_cost: booking.total_cost,

                average_rates: feedbackData?.average_rates || 0,
                total_rates: feedbackData?.total_rates || 0,
                total_feedback: feedbackData?.total_feedback || 0,
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

/** appointment booked details*/
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

        // Find the patient data
        const patientData = await Users.findOne({
            attributes: { exclude: ['password'] },
            where: { id: bookingData.booked_by }
        });

        // Find the caregiver data
        const caregiverData = await Users.findOne({
            attributes: { exclude: ['password'] },
            where: { id: bookingData.caregiver_id }
        });

        // find caregiver details data
        const caregiverDetails = await CareGiverDetails.findOne({
            where: {
                user_id: bookingData.caregiver_id
            }
        });

        // find special needs data
        const needs = await SpecialNeeds.findAll({ attributes: ['needs'], where: { user_id: userId } });
        const conditions = await Conditions.findAll({ attributes: ['conditions'], where: { user_id: userId } });

        const feedbackData = await FeedbackSummary.findOne({
            where: { caregiver_id: bookingData.caregiver_id }
        });

        const { user_id, booking_for } = bookingData;

        let memberData
        if (booking_for !== 'self') {
            memberData = await PatientMember.findOne({ where: { id: user_id } });
        }


        let isFeedbackExist = false;
        const feedbackExist = await Feedback.findOne({ where: { user_id: userId, appointment_id: appointmentId } });
        if (feedbackExist) {
            isFeedbackExist = true;
        }

        // Destructure memberData and provide default values
        const data = {
            isFeedbackExist,
            bookingData,
            patientData,
            caregiverData,
            needs,
            conditions,
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
                "account_status": "",
                "pin_code": "",
                "created_at": "",
                "updated_at": ""
            },
            caregiverDetails: caregiverDetails || {
                "id": "",
                "user_id": "",
                "week_hours": "",
                "worker_role": "",
                "work_area": "",
                "background_submitted": false,
                "background_verified": 'pending',
                "language_speak": "",
                'services': "",
                'experience': 0,
                "about": "",
                "services_cost": 0,
                "created_at": "",
                "updated_at": "",
            },
            patientFeedback: feedbackExist,
            ...(feedbackData ? feedbackData.toJSON() : { average_rates: 0, total_rates: 0, total_feedback: 0 }),
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

/** add feedback */
async function addFeedback(req, res) {
    try {
        let userId = req.userId;
        let caregiverId = req.params.id;

        // check caregiver exist or not
        const caregiverExist = await Users.findOne({ where: { id: caregiverId, role: 'caregiver' } });
        if (!caregiverExist) {
            return res.status(404).json({
                status: 'error',
                message: 'Caregiver does not exist.'
            });
        }

        // playload or storing data (rate and commentes)
        const { rate, comments, appointment_id } = req.body;

        // store comments and reates and other information into Feeback table
        let newFeedback = await Feedback.create({
            user_id: userId,
            caregiver_id: caregiverId,
            appointment_id,
            rate,
            comments
        });

        // fatch Feedback Summary data of caregive
        let feedbackData = await FeedbackSummary.findOne({ where: { caregiver_id: caregiverId } });

        let total_feedback = parseInt(feedbackData.total_feedback) + 1;
        let total_rates = parseFloat(feedbackData.total_rates) + parseFloat(rate);
        let average_rates = total_feedback > 0 ? (total_rates / total_feedback).toFixed(1) : 0;

        let avgRate = Math.floor(average_rates)
        let decimalPoint = parseFloat((average_rates - avgRate).toFixed(2));

        let avg_rate = decimalPoint >= 0.5
            ? parseFloat((avgRate + 0.5).toFixed(1))
            : parseFloat(avgRate.toFixed(1));

        await FeedbackSummary.update({ total_feedback, total_rates, average_rates: avg_rate }, { where: { caregiver_id: caregiverId } });


        return res.status(200).json({ status: 'success', message: 'Feedback added Successfully', data: newFeedback });
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
        const caregiverId = req.params.id;
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

        return res.status(200).json({ status: 'success', message: 'Feedback data', data: responseData });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// caregiver search filter data
async function filterData(req, res) {
    try {
        let userId = req.userId;

        // Fetch feedback data with pagination
        const languages = await LanguageSpeak.findAll({
            attributes: ['language']
        });

        const specialNeeds = await SpecialNeeds.findAll({
            attributes: ['needs'],
            where: { user_id: userId }
        });

        const condition = await Conditions.findAll({
            attributes: ['conditions'],
            where: { user_id: userId }
        });

        const service = await Services.findAll({
            attributes: ['services']
        });

        const caregiverDetails = await CareGiverDetails.findAll({
            attributes: ['user_id'],
            where: {
                background_verified: 'approved'
            }
        });

        // Extract user_ids from caregiverDetails
        const caregiverUserIds = caregiverDetails.map(caregiver => caregiver.user_id);

        const cities = await Users.findAll({
            attributes: ['city'],
            where: {
                id: caregiverUserIds
            },
            group: ['city'], // Group by city to get unique cities
            raw: true // To get raw data instead of Sequelize instances
        });

        const uniqueCities = cities.map(city => city.city).filter(city => city !== null);

        const genders = [
            { value: 'Male' },
            { value: 'Female' },
            { value: 'Non-Binary' }
        ];

        const worker_role = [
            { value: 'Full Time' },
            { value: 'Part Time' },
            { value: 'Casual' },
            { value: 'Student' },
        ];

        let data = {
            uniqueCities,
            condition,
            specialNeeds,
            worker_role,
            genders,
            service,
            languages,
        }
        return res.status(200).json({ status: 'success', message: 'Feedback data', data });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** send referral */
async function sendReferral(req, res) {
    try {
        let userId = req.userId;

        // check user exist or not
        let user = await Users.findOne({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User does not exist.'
            });
        }

        const schema = Joi.object({
            full_name: Joi.string(),
            email: Joi.string().required(),
            address1: Joi.string().allow('', null).optional(),
            address2: Joi.string().allow('', null).optional(),
            mobile_number: Joi.string().allow('', null).optional(),
            country: Joi.string().allow('', null).optional(),
            state: Joi.string().allow('', null).optional(),
            city: Joi.string().allow('', null).optional(),
            pin_code: Joi.string().allow('', null).optional(),
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

        const IOSURL = 'www.techreale.com';
        const androidURL = 'www.techreale.com';
        const webURL = 'http://d28qzefaa2n2nh.cloudfront.net/';

        await sendEmail(
            value.email,
            'Invitation to join in careDac',
            `${user.full_name} has invited you to join careDac Application, \n
            Application link :- \n
                -> IOS link :- ${IOSURL} \n
                -> Android link :- ${androidURL} \n
            Website link : ${webURL}`
        );

        // store comments and reates and other information into Feeback table
        let newReferral = await Referral.create({
            ...value,
            user_id: userId,
        });

        return res.status(200).json({ status: 'success', message: 'Referral sent Successfully', data: newReferral });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

async function checkPricingAndUnavailability(req, res) {
    try {
        const { booking_date, start_time, end_time } = req.query;
        const selectedDate = moment(booking_date).format('YYYY-MM-DD');
        const weekday = getDayFromDate(selectedDate);

        const holiday = await Holiday.findOne({
            where: {
                [Op.and]: [
                    { holiday_start_date: { [Op.lte]: `${selectedDate}` } },
                    { holiday_end_date: { [Op.gte]: selectedDate } }
                ]
            }
        });
        let pricing = await ServicesCost.findAll({});
        if (holiday) {
            const stdHoliPrice = pricing.find((p) => p.sub_type === 'standard' && p.type === 'holiday');
            const nstdHoliPrice = pricing.find((p) => p.sub_type === 'nonstandard' && p.type === 'holiday');
            if (!stdHoliPrice || !nstdHoliPrice) {
                throw new Error('Standard and non-standard holiday prices are required.');
            }
            if (stdHoliPrice.start_time !== nstdHoliPrice.end_time || nstdHoliPrice.start_time !== stdHoliPrice.end_time) {
                throw new Error('Price not available');
            }
        } else {
            let stdPrice, nstdPrice;
            if (weekday === 'Sunday') {
                stdPrice = pricing.find((p) => p.sub_type === 'standard' && p.type === 'sunday');
                nstdPrice = pricing.find((p) => p.sub_type === 'nonstandard' && p.type === 'sunday');
                if (!stdPrice || !nstdPrice) {
                    throw new Error('Price not available');
                }
                if (stdPrice.start_time !== nstdPrice.end_time || nstdPrice.start_time !== stdPrice.end_time) {
                    throw new Error('Price not available.');
                }
            } else if (weekday === 'Saturday') {
                stdPrice = pricing.find((p) => p.sub_type === 'standard' && p.type === 'saturday');
                nstdPrice = pricing.find((p) => p.sub_type === 'nonstandard' && p.type === 'saturday');
                if (!stdPrice || !nstdPrice) {
                    throw new Error('Price not available.');
                }
                if (stdPrice.start_time !== nstdPrice.end_time || nstdPrice.start_time !== stdPrice.end_time) {
                    throw new Error('Price not available.');
                }
            } else {
                stdPrice = pricing.find((p) => p.sub_type === 'standard' && p.type === 'weekday');
                nstdPrice = pricing.find((p) => p.sub_type === 'nonstandard' && p.type === 'weekday');
                if (!stdPrice || !nstdPrice) {
                    throw new Error('Price not available.');
                }
                if (stdPrice.start_time !== nstdPrice.end_time || nstdPrice.start_time !== stdPrice.end_time) {
                    throw new Error('Price not available.');
                }
            }
        }

        const appointments = await AppointmentBooking.findOne({
            where: {
                [Op.or]: [
                    {
                        start_appointment: {
                            [Op.between]: [new Date(start_time), new Date(end_time)]
                        }
                    },
                    {
                        end_appointment: {
                            [Op.between]: [new Date(start_time), new Date(end_time)]
                        }
                    },
                    {
                        [Op.and]: [
                            { start_appointment: { [Op.lte]: new Date(start_time) } },
                            { end_appointment: { [Op.gte]: new Date(end_time) } }
                        ]
                    }
                ],
                caregiver_id: req.params.id
            }
        });
        console.log(appointments, "appointments---------------", new Date(start_time), new Date(end_time), req.params.id);
        if (appointments) {
            throw new Error('Appointment slots are already booked');
        }
        return res.status(200).json({ status: "success", message: "Slot available for booking" })
    } catch (error) {
        console.log('Error:', error.message || error);
        return res.status(500).json({
            status: 'error',
            message: error.message || 'Internal Server Error'
        });
    }
}

module.exports = {
    addPreferences,

    // member section
    addMemberDetails,
    updateMemberDetails,
    getMembers,
    getMemberDetails,
    deleteMemberDetails,

    // condition section
    addCondition,
    getCondition,
    deleteCondition,

    // special-need section
    addSpecialNeeds,
    getSpecialNeeds,
    deleteSpecialNeeds,

    // caregiver section
    caregiver,
    caregiverDetails,

    // get availability
    getAvailability,

    // Appointment
    appointmentBooking,
    appointmentBookedList,
    appointmentBookedDetails,

    // feedback section
    addFeedback,
    getFeedback,

    // caregiver search filter data
    filterData,

    // send referral
    sendReferral,
    checkPricingAndUnavailability
};
