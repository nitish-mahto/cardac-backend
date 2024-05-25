const _ = require('lodash');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const Users = require('../models/user.model');
const PatientMember = require('../models/patient_member.model');
const CareGiverDetails = require('../models/caregiver_details.model');
const AppointmentBooking = require('../models/appointment_booking.model');
const Feedback = require('../models/feedback.model');
const generateToken = require('../middleware/generate-token');
const generateOTP = require('../utils/generateOTP');
const sendEmail = require('../utils/sendEmail');
const Admin = require('../models/admin.model');
const Preference = require('../models/preference.model');
const Services = require('../models/services.model');
const Verifications = require('../models/verifications.model');
const Conditions = require('../models/condition.model');
const Referral = require('../models/referral.model');
const Holiday = require('../models/holiday.model');
const SpecialNeeds = require('../models/special_needs.model');
const CaregiverAvailability = require('../models/caregiver_availability.model');
const CaregiverUnavailability = require('../models/caregiver_unavailability.model');
const CaregiverDetails = require('../models/caregiver_details.model');
const FeedbackSummary = require('../models/feedback_summary.model');
const ServicesCost = require('../models/services_cost.model');
const { calculateAge, calculateTimeDifference, extractDateWithMoment } = require('../utils/date.utils');
const { getDayFromDate, generateAvailabilityStatus, getAppointmentsSlots, getUnavailableSlots, getDatesInRange, allSlots } = require('../utils/utils.js');
const CompanyInfo = require('../models/company_info.model');
const { Op, sequelize, Sequelize } = require('sequelize');
const moment = require('moment');
const languageSpeak = require('../models/language_speak.model');
const NewCaregiverAvailability = require('../models/newCaregiverAvailability.js');
const { deleteImageFromS3 } = require("../utils/fileUpload.util.js");

/** admin login */
async function login(req, res) {
    try {
        const schema = Joi.object().keys({
            email: Joi.string().email().required().messages({
                'string.empty': 'email cannot be an empty field',
                'any.required': 'email is a required field'
            }),
            password: Joi.string().required().messages({
                'string.empty': 'password cannot be an empty field',
                'any.required': 'password is a required field'
            })
        });

        let { value, error } = schema.validate({ ...req.body });

        const valid = (error = !null);
        if (!valid) {
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

        // check if email exists or not

        let admin = await Admin.findOne({ where: { email: value.email } });
        if (!admin) {
            return res.status(400).json({
                status: 'error',
                message: 'Please enter valid email id or password'
            });
        }

        // Compare the provided password with the hashed password in the database
        let password = value.password;
        let isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ status: 'error', message: 'Please enter valid email id or password' });
        }

        // generate token
        const token = generateToken(admin);

        admin = await Admin.findOne({
            attributes: { exclude: ['password'] },
            where: { email: value.email }
        });

        // response
        res.status(200).json({
            status: 'success',
            message: 'Login successful',
            token: token,
            data: admin
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** admin login */
async function viewProfile(req, res) {
    try {
        let adminId = req.userId;

        let admin = await Admin.findOne({
            attributes: { exclude: ['password'] },
            where: { id: adminId }
        });

        if (!admin) {
            return res.status(404).json({ status: 'error', message: 'Admin details does not exist' });
        }

        // response
        res.status(200).json({
            status: 'success',
            message: 'Admin Profile',
            data: admin
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** admin dashboard */
async function dashboard(req, res) {
    try {
        let adminId = req.userId;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });

        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can access it.' });

        const patients = await Users.count({
            where: { role: 'patient' }
        });

        const caregivers = await Users.count({
            where: { role: 'caregiver' }
        });

        // const appointments = await AppointmentBooking.count({});
        const { count, rows: appointments } = await AppointmentBooking.findAndCountAll({});

        let totalCost = 0;
        appointments.forEach((booking) => {
            const cost = parseFloat(booking.total_cost);
            totalCost += cost;
        });

        totalCost = parseFloat(totalCost.toFixed(2));
        const holidays = await Holiday.count({});

        const currentDate = new Date().toJSON().slice(0, 10);

        const todayTotalCost = await AppointmentBooking.sum('total_cost', {
            where: {
                created_at: {
                    [Op.gte]: currentDate + ' 00:00:00', // Start of today
                    [Op.lte]: currentDate + ' 23:59:59'  // End of today
                }
            }
        });

        let data = {
            total_patients: patients,
            total_caregiver: caregivers,
            total_appointments: count,
            total_payments_amount: totalCost,
            total_holidays: holidays,
            today_payment: todayTotalCost || 0,
        };
        res.status(200).json({ status: 'success', message: `dashboard data`, data });
    } catch (error) {
        console.error('Error', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

/** list of patient/caregiver  */
async function usersList(req, res) {
    try {
        let adminId = req.userId;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });

        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can access it.' });

        const { page = 1, limit = 10, role, q } = req.query;
        const offset = (page - 1) * limit;

        let whereCondition = {}; // Initialize an empty condition

        if (role) {
            whereCondition = { role };
        }

        if (q) {
            whereCondition = {
                full_name: {
                    [Op.like]: `%${q}%`
                }
            };
        }

        const totalCount = await Users.count({
            where: whereCondition
        });

        const totalPages = Math.ceil(totalCount / limit);

        // Fetch user list
        const users = await Users.findAll({
            where: whereCondition,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['id', 'DESC']]
        });

        // Map through the array of users to transform them individually
        const data = await Promise.all(
            users.map(async (user) => {
                let caregiverDetails = null;

                // Check if role is caregiver or not
                if (role === 'caregiver') {
                    // Fetch caregiver details
                    caregiverDetails = await CareGiverDetails.findOne({
                        attributes: ['background_submitted', 'background_verified', 'verified_notes', 'services_cost'],
                        where: { user_id: user.id }
                    });
                }

                // Set default values if caregiverDetails is not found
                const background_submitted = caregiverDetails ? caregiverDetails.background_submitted : false;
                const background_verified = caregiverDetails ? caregiverDetails.background_verified : 'pending';
                const verified_notes = caregiverDetails ? caregiverDetails.verified_notes : null;

                // Transform user data
                return {
                    ...user.toJSON(),
                    background_submitted,
                    background_verified,
                    verified_notes
                };
            })
        );

        return res.status(200).json({
            status: 'success',
            message: `List of ${role}`,
            data,
            page,
            limit,
            totalCount,
            totalPages
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** list of background verified caregivers  */
async function caregivers(req, res) {
    try {
        let adminId = req.userId;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });

        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can access it.' });

        const { page = 1, limit = 100, q } = req.query;
        const offset = (page - 1) * limit;

        let caregives = await CareGiverDetails.findAll({ where: { background_verified: 'approved' } });

        // Extract user_ids from caregives
        const caregiverUserIds = caregives.map((caregiver) => caregiver.user_id);

        let whereCondition = {};

        if (q) {
            whereCondition = {
                ...whereCondition,
                full_name: {
                    [Op.like]: `%${q}%`
                }
            };
        }

        // Add condition to fetch only users with ids present in caregiverUserIds
        whereCondition = {
            ...whereCondition,
            id: caregiverUserIds
        };

        const totalCount = await Users.count({
            where: whereCondition
        });

        const totalPages = Math.ceil(totalCount / limit);

        // Fetch user list
        const users = await Users.findAll({
            where: whereCondition,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['id', 'DESC']]
        });

        return res.status(200).json({
            status: 'success',
            message: `List of caregivers`,
            data: users,
            page,
            limit,
            totalCount,
            totalPages
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** list of patient  */
async function getUserDetails(req, res) {
    try {
        let adminId = req.userId;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });

        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can access it.' });

        let userId = req.params.id;

        const user = await Users.findOne({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User does not exist.'
            });
        }

        let caregiverDetails = null;
        // check if role is caregiver or not
        if (user.role === 'caregiver') {
            caregiverDetails = await CareGiverDetails.findOne({
                // attributes: ['background_submitted', 'background_verified', 'verified_notes'],
                where: { user_id: user.id }
            });
        }

        let data;

        if (caregiverDetails) {
            data = {
                ...user.toJSON(),
                ...caregiverDetails.toJSON()
            };
        } else {
            data = {
                ...user.toJSON()
            };
        }

        return res.status(200).json({
            status: 'success',
            message: `${user.role} Data`,
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

/** delete account */
async function deleteAccount(req, res) {
    try {
        let adminId = req.userId;
        let userId = req.params.id;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can Delete Account.' });

        let user = await Users.findOne({ where: { id: userId } });
        if (!user) return res.status(404).json({ status: 'error', message: 'User does not exist.' });
        await Users.update({ account_status: 'deleted', account_status_notes: "Your account is deleted" }, { where: { id: userId } });
        if (user && user.role === 'caregiver') {
            let caregiverData = await CareGiverDetails.update({ background_submitted: false, background_verified: 'pending' }, { where: { user_id: userId } });
            caregiverData = await CareGiverDetails.findOne({ where: { user_id: userId } });

            if (caregiverData?.covid_doc && caregiverData?.covid_doc != "" && caregiverData?.covid_doc != null) {
                let covidDocFileUrl = await caregiverData?.covid_doc?.replace(/^\//, "");
                await deleteImageFromS3(covidDocFileUrl);
            }

            if (caregiverData?.first_aid_doc && caregiverData?.first_aid_doc != "" && caregiverData?.first_aid_doc != null) {
                let firstAidDocFileUrl = await caregiverData?.first_aid_doc?.replace(/^\//, "");
                await deleteImageFromS3(firstAidDocFileUrl);
            }

            if (caregiverData?.ndis_doc && caregiverData?.ndis_doc != "" && caregiverData?.ndis_doc != null) {
                let ndisDocFileUrl = await caregiverData?.ndis_doc?.replace(/^\//, "");
                await deleteImageFromS3(ndisDocFileUrl);
            }

            if (caregiverData?.police_doc && caregiverData?.police_doc != "" && caregiverData?.police_doc != null) {
                let policeDocFileUrl = await caregiverData?.police_doc?.replace(/^\//, "");
                await deleteImageFromS3(policeDocFileUrl);
            }

            if (caregiverData?.child_doc && caregiverData?.child_doc != "" && caregiverData?.child_doc != null) {
                let childDocFileUrl = await caregiverData?.child_doc?.replace(/^\//, "");
                await deleteImageFromS3(childDocFileUrl);
            }

            if (caregiverData?.visa_doc && caregiverData?.visa_doc != "" && caregiverData?.visa_doc != null) {
                let visaDocFileUrl = await caregiverData?.visa_doc?.replace(/^\//, "");
                await deleteImageFromS3(visaDocFileUrl);
            }

            if (caregiverData?.resume && caregiverData?.resume != "" && caregiverData?.resume != null) {
                let resumeFileUrl = await caregiverData?.resume?.replace(/^\//, "");
                await deleteImageFromS3(resumeFileUrl);
            }
        }

        res.status(200).json({ status: 'success', message: 'Account deleted successfully.' });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// change background status
async function changeBackgroundStatus(req, res) {
    try {
        let caregiverId = req.params.id;
        let adminId = req.userId;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });

        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can change background status.' });

        const { background_verified, verified_notes } = req.body;
        await CareGiverDetails.update({ background_verified, verified_notes }, { where: { user_id: caregiverId } });

        return res.status(200).json({ status: 'success', message: `Background Status ${background_verified} Successfully` });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// verify document
async function verifyDoc(req, res) {
    try {
        let caregiverId = req.params.id;
        let adminId = req.userId;
        const admin = await Admin.findOne({ where: { id: adminId } });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can verify Documents.' });

        const { doc_status, doc_verified_notes, doc_type } = req.body;
        if (doc_type == 'covid_doc') {
            await CareGiverDetails.update({ covid_doc_status: doc_status, covid_doc_verified_notes: doc_verified_notes }, { where: { user_id: caregiverId } });
        }

        if (doc_type == 'first_aid_doc') {
            await CareGiverDetails.update({ first_aid_doc_status: doc_status, first_aid_verified_notes: doc_verified_notes }, { where: { user_id: caregiverId } });
        }

        if (doc_type == 'ndis_doc') {
            await CareGiverDetails.update({ ndis_doc_status: doc_status, ndis_doc_verified_notes: doc_verified_notes }, { where: { user_id: caregiverId } });
        }

        if (doc_type == 'police_doc') {
            await CareGiverDetails.update({ police_doc_status: doc_status, police_doc_verified_notes: doc_verified_notes }, { where: { user_id: caregiverId } });
        }

        if (doc_type == 'child_doc') {
            await CareGiverDetails.update({ child_doc_status: doc_status, child_doc_verified_notes: doc_verified_notes }, { where: { user_id: caregiverId } });
        }

        if (doc_type == 'visa_doc') {
            await CareGiverDetails.update({ visa_doc_status: doc_status, visa_doc_verified_notes: doc_verified_notes }, { where: { user_id: caregiverId } });
        }

        if (doc_type == 'resume') {
            await CareGiverDetails.update({ resume_status: doc_status, resume_verified_notes: doc_verified_notes }, { where: { user_id: caregiverId } });
        }

        return res.status(200).json({ status: 'success', message: `Document ${doc_status} Successfully` });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// change Account status
async function changeAccountStatus(req, res) {
    try {
        let userId = req.params.id;
        let adminId = req.userId;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can change Account status.' });

        const { account_status, account_status_notes } = req.body;

        await Users.update({ account_status, account_status_notes }, { where: { id: userId } });

        return res.status(200).json({ status: 'success', message: `Account Status ${account_status} Successfully` });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** appointment booked list/data */
async function appointmentBooking(req, res) {
    try {
        let adminId = req.userId;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });

        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can access it.' });

        const { page = 1, limit = 10 } = req.query;

        const { count, rows: bookingData } = await AppointmentBooking.findAndCountAll({
            limit: parseInt(limit, 10),
            offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
            order: [['id', 'DESC']]
        });

        const userIds = bookingData.map((booking) => booking.user_id);
        const caregiverIds = bookingData.map((booking) => booking.caregiver_id);

        const [users, caregivers, members, feedbackSummaries] = await Promise.all([
            Users.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'full_name', 'profile_image', 'dob', 'age', 'gender', 'account_status'] }),
            Users.findAll({ where: { id: { [Op.in]: caregiverIds } }, attributes: ['id', 'full_name', 'profile_image', 'dob', 'age', 'account_status'] }),
            PatientMember.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'full_name', 'dob', 'age'] }),
            FeedbackSummary.findAll({ where: { caregiver_id: { [Op.in]: caregiverIds } }, attributes: ['id', 'caregiver_id', 'average_rates', 'total_rates', 'total_feedback'] })
        ]);

        const transformedData = await Promise.all(
            bookingData.map(async (booking) => {
                const user = users.find((user) => user.id === booking.user_id);
                const caregiver = caregivers.find((caregiver) => caregiver.id === booking.caregiver_id);
                const memberData = members.find((member) => member.id === booking.user_id);
                const feedbackData = feedbackSummaries.find((feedback) => feedback.caregiver_id === booking.caregiver_id);

                return {
                    id: booking.id,
                    user_id: booking.user_id,
                    patient_full_name: user?.full_name || null,
                    patient_profile_image: user?.profile_image || null,
                    patient_age: user?.age || null,
                    patient_gender: user?.gender || null,
                    patient_account_status: user?.account_status,


                    caregiver_id: booking.caregiver_id,
                    caregiver_full_name: caregiver?.full_name || null,
                    caregiver_profile_image: caregiver?.profile_image || null,
                    caregiver_age: caregiver?.age || null,
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
                    total_cost: booking.total_cost,

                    average_rates: feedbackData?.average_rates || 0,
                    total_rates: feedbackData?.total_rates || 0,
                    total_feedback: feedbackData?.total_feedback || 0,
                    created_at: booking.created_at,
                    updated_at: booking.updated_at
                };
            })
        );
        const totalPages = Math.ceil(count / limit);
        return res.status(200).json({
            status: 'success',
            message: 'Appointment Booked Data',
            data: transformedData,
            pagination: {
                total_documents: count,
                total_pages: totalPages,
                current_page: parseInt(page, 10),
                limit: parseInt(limit, 10)
            }
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
        let adminId = req.userId;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });

        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can access it.' });
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
            attributes: ['id', 'full_name', 'profile_image', 'gender', 'dob', 'mobile_number', 'services', 'email', 'mobile_number', 'emergency_mobile_number', 'account_status', 'created_at', 'updated_at'],
            where: { id: bookingData.user_id }
        });

        // Find caregiver details for caregiver_id
        const caregiver = await Users.findOne({
            attributes: ['id', 'full_name', 'services', 'profile_image', 'gender', 'dob', 'account_status', 'created_at', 'updated_at'],
            where: { id: bookingData.caregiver_id }
        });

        const caregiverDetails = await CaregiverDetails.findOne({
            attributes: [
                'id',
                'user_id',
                'week_hours',
                'worker_role',
                'work_area',
                'services_cost',
                'background_submitted',
                'about',
                'background_verified',
                'language_speak',
                'created_at',
                'updated_at'
            ],
            where: {
                user_id: bookingData.caregiver_id
            }
        });

        let data = {
            bookingData,
            patientData: user,
            caregiver,
            caregiverDetails
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

/** appointment booked list/data of particular patient*/
async function appointmentBookingById(req, res) {
    try {
        let patientId = req.params.id;
        let adminId = req.userId;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });

        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can access it.' });

        const { page = 1, limit = 10 } = req.query;

        const { count, rows: bookingData } = await AppointmentBooking.findAndCountAll({
            where: {
                booked_by: patientId
            },
            limit: parseInt(limit, 10),
            offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
            order: [['id', 'DESC']]
        });

        const userIds = bookingData.map((booking) => booking.user_id);
        const caregiverIds = bookingData.map((booking) => booking.caregiver_id);

        const [users, caregivers, members, feedbackSummaries] = await Promise.all([
            Users.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'full_name', 'dob', 'age', 'gender'] }),
            Users.findAll({ where: { id: { [Op.in]: caregiverIds } }, attributes: ['id', 'full_name', 'dob', 'age'] }),
            PatientMember.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ['id', 'full_name', 'dob', 'age'] })
        ]);

        const transformedData = await Promise.all(
            bookingData.map(async (booking) => {
                const user = users.find((user) => user.id === booking.user_id);
                const caregiver = caregivers.find((caregiver) => caregiver.id === booking.caregiver_id);
                const memberData = members.find((member) => member.id === booking.user_id);

                return {
                    id: booking.id,
                    user_id: booking.user_id,
                    patient_full_name: user?.full_name || null,
                    patient_age: user?.age || null,
                    patient_gender: user?.gender || null,

                    caregiver_id: booking.caregiver_id,
                    caregiver_full_name: caregiver?.full_name || null,
                    caregiver_age: caregiver?.age || null,

                    member_id: memberData?.id || null,
                    member_full_name: memberData?.full_name || null,
                    member_dob: memberData?.dob || null,
                    member_age: memberData?.age || null,

                    booking_for: booking.booking_for,
                    booked_by: booking.booked_by,
                    start_appointment: booking.start_appointment,
                    end_appointment: booking.end_appointment,
                    booking_status: booking.booking_status,
                    total_cost: booking.total_cost,

                    created_at: booking.created_at,
                    updated_at: booking.updated_at
                };
            })
        );
        const totalPages = Math.ceil(count / limit);
        return res.status(200).json({
            status: 'success',
            message: 'Appointment Booked Data',
            data: transformedData,
            pagination: {
                total_documents: count,
                total_pages: totalPages,
                current_page: parseInt(page, 10),
                limit: parseInt(limit, 10)
            }
        });
    } catch (error) {
        console.log('Error :', error || error.message);

        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// change Service cost amounts
async function changeServiceCost(req, res) {
    try {
        const adminId = req.userId;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) {
            return res.status(404).json({
                status: 'error',
                message: 'Only Admin can view pricing details.'
            });
        }
        let serviceCost;
        // joi schema validation
        const schema = Joi.object().keys({
            type: Joi.string().valid('weekday', 'saturday', 'sunday', 'holiday').required(),
            sub_type: Joi.string().valid('standard', 'nonstandard').required(),
            price_perhour: Joi.number().required(),
            start_time: Joi.string().allow('', null),
            end_time: Joi.string().allow('', null)
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
        const existServiceCost = await ServicesCost.findOne({ where: { type: value.type, sub_type: value.sub_type } });
        if (existServiceCost) {
            await ServicesCost.update(
                {
                    price_perhour: value.price_perhour,
                    start_time: value.start_time,
                    end_time: value.end_time
                },
                {
                    where: { type: value.type, sub_type: value.sub_type }
                }
            );
            serviceCost = await ServicesCost.findOne({ where: { type: value.type, sub_type: value.sub_type } });
        } else {
            serviceCost = await ServicesCost.create({
                type: value.type,
                sub_type: value.sub_type,
                price_perhour: value.price_perhour,
                start_time: value.start_time,
                end_time: value.end_time
            });
        }

        return res.status(200).json({ status: 'success', message: 'Pricing data added successfully', data: serviceCost });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// get Service cost list
async function getServiceCost(req, res) {
    try {
        let adminId = req.userId;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can Add Services Cost.' });

        let serviceCost = await ServicesCost.findAll();
        return res.status(200).json({ status: 'success', message: `List of services cost`, data: serviceCost });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** Register new caregiver Details */
async function caregiverRegistration(req, res) {
    try {
        // Get admin ID from the request
        const adminId = req.userId;

        // Check if admin exists
        const admin = await Admin.findOne({ where: { id: adminId } });

        // If admin doesn't exist, return an error response
        if (!admin) {
            return res.status(404).json({
                status: 'error',
                message: 'Only admin can register caregiver details.'
            });
        }

        // Define Joi schema for basic user details
        const basicDetailsSchema = Joi.object({
            full_name: Joi.string()
                .regex(/^[a-zA-Z ]*$/, 'Characters only allowed in full_name')
                .allow('')
                .required(),
            email: Joi.string().email().required().messages({
                'string.empty': 'email cannot be an empty field',
                'any.required': 'email is a required field'
            }),
            mobile_number: Joi.string()
                .trim()
                .regex(/^[+0-9 ]{3,15}$/)
                .optional()
                .messages({
                    'string.pattern.base': 'Invalid mobile number format'
                }),
            password: Joi.string().required().messages({
                'string.empty': 'password cannot be an empty field',
                'any.required': 'password is a required field'
            }),
            gender: Joi.string().required().messages({
                'string.empty': 'gender cannot be an empty field',
                'any.required': 'gender is a required field'
            }),
            dob: Joi.string().required().messages({
                'string.empty': 'dob cannot be an empty field',
                'any.required': 'dob is a required field'
            }),
            services: Joi.string().allow('')
        }).options({ stripUnknown: true });

        // Define Joi schema for caregiver details
        const caregiverDetailsSchema = Joi.object({
            covid_doc: Joi.string().allow(''),
            first_aid_doc: Joi.string().allow(''),
            ndis_doc: Joi.string().allow(''),
            police_doc: Joi.string().max(100).allow(''),
            child_doc: Joi.string().max(100).allow(''),
            visa_doc: Joi.string().max(255).allow(''),
            resume: Joi.string().max(255).allow(''),
            is_resume: Joi.string().valid('yes', 'no').default('no'),
            is_disability: Joi.string().valid('yes', 'no').default('no'),
            week_hours: Joi.string().allow(''),
            is_police_check: Joi.string().valid('yes', 'no').default('no'),
            qualification: Joi.string().allow(''),
            child_check: Joi.string().valid('yes', 'no').default('no'),
            ndis_check: Joi.string().valid('yes', 'no').default('no'),
            first_aid_check: Joi.string().valid('yes', 'no').default('no'),
            worker_role: Joi.string().max(50).allow(''),
            work_area: Joi.string().max(30).allow(''),
            language_speak: Joi.string().allow(''),
            experience: Joi.string().allow('')
        }).options({ stripUnknown: true });

        // Validate basic user details
        const { value: basicDetails, error: basicDetailsError } = basicDetailsSchema.validate(req.body);

        // Validate caregiver details
        const { value: caregiverDetails, error: caregiverDetailsError } = caregiverDetailsSchema.validate(req.body);

        // If there's an error in basic user details, return an error response
        if (basicDetailsError) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid request data',
                data: {
                    original: basicDetails,
                    details: basicDetailsError.details.map(({ message, type }) => ({
                        message: message.replace(/['"]/g, ''),
                        type
                    }))
                }
            });
        }

        // If there's an error in caregiver details, log the detailsError and return an error response
        if (caregiverDetailsError) {
            console.log('caregiverDetailsError: ', caregiverDetailsError);
            return res.status(400).json({
                status: 'error',
                message: 'Invalid request data',
                data: {
                    original: req.body,
                    details: caregiverDetailsError.details.map(({ message, type }) => ({
                        message: message.replace(/['"]/g, ''),
                        type
                    }))
                }
            });
        }

        // Check if the email already exists
        const existingEmail = await Users.findOne({ where: { email: basicDetails.email } });

        // If email exists, return an error response
        if (existingEmail) {
            return res.status(403).json({
                status: 'error',
                message: 'Caregiver already exists.'
            });
        }

        // Calculate age from date of birth
        const age = calculateAge(basicDetails.dob);

        // Find the last service cost amount
        const lastServiceCost = await ServicesCost.findOne({ order: [['created_at', 'DESC']] });

        // Create a new user with basic details
        const newUser = await Users.create({ ...basicDetails, role: 'caregiver', age, account_status: 'active', account_status_notes: 'your account is active' });

        // Create caregiver details for the new user
        const newCaregiverDetails = await CareGiverDetails.create({
            user_id: newUser.id,
            ...caregiverDetails,
            background_submitted: true,
            services_cost: lastServiceCost?.services_cost ?? 0
        });

        // add availability
        const array = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        for (let i = 0; i < array.length; i++) {
            const day = array[i];
            await NewCaregiverAvailability.create({
                caregiver_id: newUser.id,
                week_day: day,
                morning_start_time: '',
                morning_end_time: '',
                evening_start_time: '',
                evening_end_time: ''
            });
        }

        // FeedbackSummary data store
        await FeedbackSummary.create({ caregiver_id: newUser.id });

        // Prepare the response data
        const data = {
            newUser,
            newCaregiverDetails
        };

        // Send a success response
        res.status(200).json({
            status: 'success',
            message: 'Registration Successful',
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

/** update caregiver Details */
async function updateCaregiver(req, res) {
    try {
        // Get admin ID from the request
        const adminId = req.userId;
        const userId = req.params.id;

        // Check if admin exists
        const admin = await Admin.findOne({ where: { id: adminId } });

        // If admin doesn't exist, return an error response
        if (!admin) {
            return res.status(404).json({
                status: 'error',
                message: 'Only admin can register caregiver details.'
            });
        }

        // Define Joi schema for basic user details
        const basicDetailsSchema = Joi.object({
            full_name: Joi.string()
                .regex(/^[a-zA-Z ]*$/, 'Characters only allowed in full_name')
                .allow(''),
            email: Joi.string().email(),
            mobile_number: Joi.string()
                .trim()
                .regex(/^[+0-9 ]{3,15}$/)
                .optional()
                .messages({
                    'string.pattern.base': 'Invalid mobile number format'
                }),
            password: Joi.string(),
            gender: Joi.string(),
            dob: Joi.string(),
            services: Joi.string().allow('')
        }).options({ stripUnknown: true });

        // Define Joi schema for caregiver details
        const caregiverDetailsSchema = Joi.object({
            covid_doc: Joi.string().allow(''),
            first_aid_doc: Joi.string().allow(''),
            ndis_doc: Joi.string().allow(''),
            police_doc: Joi.string().max(100).allow(''),
            child_doc: Joi.string().max(100).allow(''),
            visa_doc: Joi.string().max(255).allow(''),
            resume: Joi.string().max(255).allow(''),
            is_resume: Joi.string().valid('yes', 'no').default('no'),
            is_disability: Joi.string().valid('yes', 'no').default('no'),
            week_hours: Joi.string().allow(''),
            is_police_check: Joi.string().valid('yes', 'no').default('no'),
            qualification: Joi.string().allow(''),
            child_check: Joi.string().valid('yes', 'no').default('no'),
            ndis_check: Joi.string().valid('yes', 'no').default('no'),
            first_aid_check: Joi.string().valid('yes', 'no').default('no'),
            worker_role: Joi.string().max(50).allow(''),
            work_area: Joi.string().max(30).allow(''),
            language_speak: Joi.string().allow(''),
            other_language: Joi.string().allow(''),
            experience: Joi.string().allow('')
        }).options({ stripUnknown: true });

        // Validate basic user details
        const { value: basicDetails, error: basicDetailsError } = basicDetailsSchema.validate(req.body);

        // Validate caregiver details
        const { value: caregiverDetails, error: caregiverDetailsError } = caregiverDetailsSchema.validate(req.body);

        // If there's an error in basic user details, return an error response
        if (basicDetailsError) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid request data',
                data: {
                    original: basicDetails,
                    details: basicDetailsError.details.map(({ message, type }) => ({
                        message: message.replace(/['"]/g, ''),
                        type
                    }))
                }
            });
        }

        // If there's an error in caregiver details, log the detailsError and return an error response
        if (caregiverDetailsError) {
            console.log('caregiverDetailsError: ', caregiverDetailsError);
            return res.status(400).json({
                status: 'error',
                message: 'Invalid request data',
                data: {
                    original: req.body,
                    details: caregiverDetailsError.details.map(({ message, type }) => ({
                        message: message.replace(/['"]/g, ''),
                        type
                    }))
                }
            });
        }

        if (basicDetails.email) {
            // Check if the email already exists
            const existingEmail = await Users.findOne({ where: { email: basicDetails.email } });
            const ownEmail = await Users.findOne({ where: { email: basicDetails.email, id: userId } });
            // If email exists, return an error response
            if (existingEmail && !ownEmail) {
                return res.status(403).json({
                    status: 'error',
                    message: 'User already exists.'
                });
            }
        }

        // Calculate age from date of birth
        const age = calculateAge(basicDetails.dob);

        // Check if other_language is present
        if (caregiverDetails.other_language) {
            // Split the comma-separated string into an array
            const languagesArray = caregiverDetails.other_language.split(',');

            // Loop through each language, capitalize the first letter, and create a new record in the database if it doesn't already exist
            for (const lang of languagesArray) {
                const trimmedLang = lang.trim(); // Trim to remove leading/trailing whitespaces
                const capitalizedLang = trimmedLang.charAt(0).toUpperCase() + trimmedLang.slice(1);

                // Check if the language already exists in the database
                const existingLanguage = await languageSpeak.findOne({ where: { language: capitalizedLang } });

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

        let language_speak = `${caregiverDetails.language_speak},${caregiverDetails.other_language}`;

        // Find the last service cost amount
        const lastServiceCost = await ServicesCost.findOne({ order: [['created_at', 'DESC']] });

        // Create a new user with basic details
        let newUser = await Users.update({ ...basicDetails, age }, { where: { id: userId } });

        // Create caregiver details for the new user
        let newCaregiverDetails = await CareGiverDetails.update(
            {
                ...caregiverDetails,
                language_speak,
                services_cost: lastServiceCost?.services_cost ?? 0
            },
            {
                where: { user_id: userId }
            }
        );

        newUser = await Users.findOne({ where: { id: userId } });
        newCaregiverDetails = await CareGiverDetails.findOne({ where: { user_id: userId } });

        // Prepare the response data
        const data = {
            newUser,
            newCaregiverDetails
        };

        // Send a success response
        res.status(200).json({
            status: 'success',
            message: 'Registration Successful',
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

// Update Company Guidelines
async function updateCompanyGuidelines(req, res) {
    try {
        let adminId = req.userId;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can Update Company Guidelines.' });

        const { guidelines } = req.body;
        await CompanyInfo.update({ guidelines }, { where: { id: 1 } });

        return res.status(200).json({ status: 'success', message: `Company guidelines updated Successfully` });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// view Company Guidelines
async function viewCompanyGuidelines(req, res) {
    try {
        let guidelines = await CompanyInfo.findOne({ attributes: ['guidelines'] });
        return res.status(200).json({ status: 'success', message: `Company guidelines`, data: guidelines });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// Update Company Policies
async function updateCompanyPolicies(req, res) {
    try {
        let adminId = req.userId;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can Update Company Policies.' });

        const { policies } = req.body;
        await CompanyInfo.update({ policies }, { where: { id: 1 } });

        return res.status(200).json({ status: 'success', message: `Company policies updated Successfully` });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// view Company Policies
async function viewCompanyPolicies(req, res) {
    try {
        let policies = await CompanyInfo.findOne({ attributes: ['policies'] });
        return res.status(200).json({ status: 'success', message: `Company policies`, data: policies });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// Update Company Terms
async function updateCompanyTerms(req, res) {
    try {
        let adminId = req.userId;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can Update Company Terms.' });

        const { terms } = req.body;
        await CompanyInfo.update({ terms }, { where: { id: 1 } });

        return res.status(200).json({ status: 'success', message: `Terms updated Successfully` });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// view Company Terms
async function viewCompanyTerms(req, res) {
    try {
        let terms = await CompanyInfo.findOne({ attributes: ['terms'] });
        return res.status(200).json({ status: 'success', message: `Company terms`, data: terms });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// Update Company Trust & safety
async function updateCompanyTrustSafety(req, res) {
    try {
        let adminId = req.userId;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can Update Company Trust & safety.' });

        const { trust_safety } = req.body;
        await CompanyInfo.update({ trust_safety }, { where: { id: 1 } });

        return res.status(200).json({ status: 'success', message: `Trust & safety updated Successfully` });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// view Company TrustSafety
async function viewCompanyTrustSafety(req, res) {
    try {
        let trust_safety = await CompanyInfo.findOne({ attributes: ['trust_safety'] });
        return res.status(200).json({ status: 'success', message: `Company Trust & Safety`, data: trust_safety });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// add services
async function addServices(req, res) {
    try {
        let adminId = req.userId;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can Add Services.' });

        let { services } = req.body;
        services = services.toLowerCase();
        const existingService = await Services.findOne({ where: { services } });
        if (existingService) {
            throw new Error('Service with the same value already exists.');
        }
        await Services.create({ services });

        return res.status(200).json({ status: 'success', message: `Services ${services} added Successfully` });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// update services
async function updateServices(req, res) {
    try {
        let adminId = req.userId;
        let serviceId = req.params.id;

        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can Update Services.' });
        let service = await Services.findOne({ where: { id: serviceId } });
        if (!service) return res.status(404).json({ status: 'error', message: 'Services does not exist.' });

        let { services } = req.body;
        services = services.toLowerCase();
        const existingService = await Services.findOne({ where: { services } });
        if (existingService) {
            throw new Error('Service with the same value already exists.');
        }

        await Services.update({ services }, { where: { id: serviceId } });

        return res.status(200).json({ status: 'success', message: `Services ${services} updated Successfully` });
    } catch (error) {
        console.log('Error:', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// delete services
async function deleteServices(req, res) {
    try {
        let adminId = req.userId;
        let serviceId = req.params.id;

        const admin = await Admin.findOne({ where: { id: adminId } });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can Update Services.' });

        let service = await Services.findOne({ where: { id: serviceId } });
        if (!service) return res.status(404).json({ status: 'error', message: 'Services does not exist.' });

        await Services.destroy({ where: { id: serviceId } });

        return res.status(200).json({ status: 'success', message: `Services deleted Successfully` });
    } catch (error) {
        console.log('Error:', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// update appointment details
async function updateAppointment(req, res) {
    try {
        let adminId = req.userId;
        let bookingId = req.params.id;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can Update Services.' });

        let appointment = await AppointmentBooking.findOne({ where: { id: bookingId } });
        if (!appointment) return res.status(404).json({ status: 'error', message: 'Appointment does not exist.' });

        const schema = Joi.object().keys({
            caregiver_id: Joi.number().integer().required(),
            start_appointment: Joi.string(),
            end_appointment: Joi.string()
        });

        let { value, error } = schema.validate({ ...req.body });
        console.log('value: ', value);

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

        if (value.caregiver_id) {
            // check caregiverId is valid id or not(check caregiver details form caregiverId)
            let caregiverExist = await CareGiverDetails.findOne({ where: { user_id: value.caregiver_id } });

            // if not exist then
            if (!caregiverExist) {
                return res.status(404).json({ status: 'error', message: 'Appointment book only on caregiver' });
            }
        }

        // calculate dime difference
        const timeDifference = calculateTimeDifference(value.start_appointment, value.end_appointment);

        await AppointmentBooking.update({ ...value, total_hours: timeDifference }, { where: { id: bookingId } });
        let updatedAppointment = await AppointmentBooking.findOne({ where: { id: bookingId } });

        return res.status(200).json({ status: 'success', message: `Appointment updated Successfully`, data: updatedAppointment });
    } catch (error) {
        console.log('Error:', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// add services
async function viewReferrals(req, res) {
    try {
        let adminId = req.userId;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can View referrals.' });

        // get all referrals data from Referral table...
        const referrals = await Referral.findAll({});

        // Fetch user details for each referral using map
        const refinedReferrals = await Promise.all(
            referrals.map(async (referral) => {
                const user = await Users.findOne({
                    attributes: ['full_name'],
                    where: { id: referral.user_id }
                });

                return {
                    ...referral.dataValues,
                    user_full_name: user ? user.full_name : null
                };
            })
        );

        return res.status(200).json({ status: 'success', message: `Referrals Data`, data: refinedReferrals });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// view availability
async function availability(req, res) {
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
                [Op.and]: [{ holiday_start_date: { [Op.lte]: `${selectedDate}` } }, { holiday_end_date: { [Op.gte]: selectedDate } }]
            }
        });
        if (holiday) {
            is_holiday = true;
        }

        const caregiverAvailability = await NewCaregiverAvailability.findOne({
            where: { caregiver_id: req.params.id, week_day: weekday }
        });

        if (!caregiverAvailability || !caregiverAvailability.availability_slots.length) {
            // slots = generateAvailabilityStatus(allSlots, allSlots, [], [], selectedDate);
            return res.status(200).json({
                status: 'success',
                message: 'Availability data',
                data: {
                    caregiver_id: req.params.id,
                    availability_date: selectedDate,
                    is_holiday: is_holiday,
                    slot: slots
                }
            });
        } else {
            const appointments = await AppointmentBooking.findAll({
                where: {
                    caregiver_id: req.params.id,
                    start_appointment: { [Op.between]: [startDateTime.toDate(), moment(startDateTime).endOf('day').toDate()] }
                }
            });

            const bookedSlots = getAppointmentsSlots(appointments);
            const unavailableSlots = await getUnavailableSlots(req.params.id, selectedDate);

            slots = generateAvailabilityStatus(caregiverAvailability.availability_slots, unavailableSlots, caregiverAvailability.unavailable_slots, bookedSlots, selectedDate);

            return res.status(200).json({
                status: 'success',
                message: 'Availability data',
                data: {
                    id: caregiverAvailability.id,
                    caregiver_id: caregiverAvailability.caregiver_id,
                    availability_date: selectedDate,
                    weekday: weekday,
                    is_holiday: is_holiday,
                    slot: slots
                }
            });
        }
    } catch (error) {
        console.log('Error:', error || error.message);
        return res.status(500).json({ status: 'error', message: error.message });
    }
}

// add unavailability
async function addUnavailability(req, res) {
    try {
        let adminId = req.userId;
        let caregiverId = req.params.id;

        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can add unavailability.' });

        const { start_date, end_date } = req.body;

        // Create CaregiverUnavailability record
        let unavailability = await CaregiverUnavailability.create({ start_date, end_date, caregiver_id: caregiverId });

        // Response with multiple records
        return res.status(200).json({ status: 'success', message: 'Unavailabilities added successfully', data: unavailability });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// view unavailability
async function unavailability(req, res) {
    try {
        let adminId = req.userId;
        let caregiverId = req.params.id;
        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can View Unavailability.' });

        const unavailability = await CaregiverUnavailability.findAll({ where: { caregiver_id: caregiverId } });

        return res.status(200).json({ status: 'success', message: `Unavailability data`, data: unavailability });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// add holiday
async function addHoliday(req, res) {
    try {
        let adminId = req.userId;

        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can add holiday.' });

        const { holiday_start_date, holiday_end_date } = req.body;

        const newHolidays = await Holiday.create({
            holiday_start_date: holiday_start_date,
            holiday_end_date: holiday_end_date
        });

        // response
        return res.status(200).json({ status: 'success', message: 'Holidays added successfully', data: newHolidays });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// view holiday
async function viewHoliday(req, res) {
    try {
        let adminId = req.userId;

        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can view holiday.' });

        let holiday = await Holiday.findAll({});
        // response
        return res.status(200).json({ status: 'success', message: 'Holiday data list', data: holiday });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// add holiday
async function deleteHoliday(req, res) {
    try {
        let adminId = req.userId;
        let holidayId = req.params.id;

        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can delete holiday.' });

        await Holiday.destroy({ where: { id: holidayId } });

        // response
        return res.status(200).json({ status: 'success', message: 'Holiday deleted successfully' });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// add languages
async function addLanguageSpeak(req, res) {
    try {
        let adminId = req.userId;

        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can add holiday.' });

        const { language } = req.body;

        const newLanguage = await languageSpeak.create({ language });

        // response
        return res.status(200).json({ status: 'success', message: 'Language added successfully', data: newLanguage });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// delete languages
async function deleteLanguage(req, res) {
    try {
        let adminId = req.userId;
        let languageId = req.params.id;

        const admin = await Admin.findOne({
            where: { id: adminId }
        });
        if (!admin) return res.status(404).json({ status: 'error', message: 'Only admin can delete Language.' });

        await languageSpeak.destroy({ where: { id: languageId } });

        // response
        return res.status(200).json({ status: 'success', message: 'Language deleted successfully' });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}


module.exports = {
    login,
    viewProfile,
    dashboard,

    usersList,
    caregivers,
    getUserDetails,
    deleteAccount,

    changeBackgroundStatus,
    changeAccountStatus,
    verifyDoc,

    // appointment booking section
    appointmentBooking,
    appointmentBookedDetails,
    appointmentBookingById,

    // services cost section
    changeServiceCost,
    getServiceCost,

    // caregiver registration
    caregiverRegistration,
    updateCaregiver,

    // update company info section
    updateCompanyGuidelines,
    viewCompanyGuidelines,

    updateCompanyPolicies,
    viewCompanyPolicies,

    updateCompanyTerms,
    viewCompanyTerms,

    updateCompanyTrustSafety,
    viewCompanyTrustSafety,

    // services section
    addServices,
    updateServices,
    deleteServices,
    updateAppointment,

    // Referrals
    viewReferrals,

    // unavailability
    availability,
    addUnavailability,
    unavailability,

    // holiday
    addHoliday,
    viewHoliday,
    deleteHoliday,

    // Language-Speak
    addLanguageSpeak,
    deleteLanguage,
};
