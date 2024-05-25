const _ = require('lodash');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const Users = require('../models/user.model');
const Verifications = require('../models/verifications.model');
const CareGiverDetails = require('../models/caregiver_details.model');
const CaregiverAvailability = require('../models/caregiver_availability.model');
const NewCaregiverAvailability = require('../models/newCaregiverAvailability.js');
const generateToken = require('../middleware/generate-token');
const generateOTP = require('../utils/generateOTP');
const sendEmail = require('../utils/sendEmail');
const { calculateAge } = require('../utils/date.utils');
const FeedbackSummary = require('../models/feedback_summary.model');
const Feedback = require('../models/feedback.model');
const Payment = require('../models/payment.model');
const Conditions = require('../models/condition.model');
const AppointmentBooking = require('../models/appointment_booking.model');
const PatientMember = require('../models/patient_member.model');
const Preference = require('../models/preference.model');
const SpecialNeeds = require('../models/special_needs.model');
const { getUserIdFromToken } = require('../utils/getUserIdFromToken');
const moment = require('moment');
const Config = require('../config/config');
const stripe = require('stripe')(Config.STRIPE_SECRET_KEY);
const { Op } = require('sequelize');
const { deleteImageFromS3 } = require("../utils/fileUpload.util.js");

/** Register new caregiver/patient */
async function registration(req, res) {
    try {
        const schema = Joi.object().keys({
            full_name: Joi.string()
                .regex(/^[a-zA-Z ]*$/, 'Characters only allowed in full_name')
                .required()
                .messages({
                    'string.comments': 'Full name should be a type of text',
                    'string.empty': 'Full name cannot be an empty field',
                    'any.required': 'Full name is a required field'
                }),
            email: Joi.string().email().required().messages({
                'string.empty': 'email cannot be an empty field',
                'any.required': 'email is a required field'
            }),
            mobile_number: Joi.string()
                .trim()
                .regex(/^[+0-9 ]{3,15}$/, { name: 'mobile_number' }) // validate a common phone number format
                .allow('', null)
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
            role: Joi.string().required().messages({
                'string.empty': 'role cannot be an empty field',
                'any.required': 'role is a required field'
            })
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

        // check email already exist
        let existingEmail = await Users.findOne({
            where: {
                email: value.email,
                account_status: {
                    [Op.ne]: 'deleted'
                }
            }
        });

        if (existingEmail) {
            return res.status(403).json({
                status: 'error',
                message: 'User already exist.'
            });
        }

        // Generate a 4-digit OTP with numeric characters
        const OTP = await generateOTP();

        // send otp on email
        await sendEmail(value.email, 'Account Verification', `Your account verification code is : ${OTP}`);

        const age = calculateAge(value.dob);

        // store a new data
        let newUser = await Users.create({ ...value, age });

        // get otp and insert into otp collection
        await Verifications.create({
            user_id: newUser.id,
            otp: OTP
        });

        await CareGiverDetails.create({
            user_id: newUser.id,
        });

        // generate token
        const token = generateToken(newUser);

        newUser = await Users.findOne({
            attributes: { exclude: ['password'] },
            where: { id: newUser.id }
        });

        // if patient then store data in stripe
        if (newUser.role === 'patient') {
            let customer = await stripe.customers.create({
                name: newUser.full_name,
                email: newUser.email,
                phone: newUser.mobile_number,
            });

            // Store customer id into payment table
            await Payment.create({
                user_id: newUser.id,
                customer_id: customer.id,
            });

        }

        // response
        res.status(200).json({
            status: 'success',
            message: 'Registration Successfully, Verification OTP sent on your email id, Please verify your account',
            token: token,
            OTP,
            data: newUser
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** verify account */
async function verifyAccount(req, res) {
    try {
        const userId = req.userId;
        let user = await Users.findOne({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User does not exist.' });
        }
        // generate token
        const token = generateToken(user);

        let role = await user.role;

        let { otp } = req.body;

        if (user.is_verify) {
            return res.status(403).json({ status: 'error', error_code: '1003', message: 'Your account is already verified' });
        }

        let isMatch = await Verifications.findOne({ where: { user_id: userId, otp } });
        if (!isMatch) {
            return res.status(400).json({
                status: 'error',
                message: 'Please enter valid OTP'
            });
        }
        // update is_verify flag true
        user = await Users.update(
            {
                is_verify: true,
                account_status: 'active',
                account_status_notes: 'Your account is active'
            },
            {
                where: { id: user.id }
            }
        );

        // delete record from verification table after otp verified
        await Verifications.destroy({
            where: { user_id: userId }
        });

        // store default availability
        if (role === 'caregiver') {
            await FeedbackSummary.create({
                caregiver_id: userId
            });
            const array = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

            for (let i = 0; i < array.length; i++) {
                const day = array[i];
                await NewCaregiverAvailability.create({
                    caregiver_id: userId,
                    week_day: day,
                    morning_start_time: "",
                    morning_end_time: "",
                    evening_start_time: "",
                    evening_end_time: "",
                });
            }
        }
        user = await Users.findOne({
            attributes: { exclude: ['password'] },
            where: { id: userId }
        });

        let caregiverDetails = null;
        // check if role is caregiver or not        
        if (user.role === 'caregiver') {
            caregiverDetails = await CareGiverDetails.findOne({
                attributes: ['background_submitted', 'background_verified', 'week_hours', 'qualification', 'language_speak', 'about'],
                where: { user_id: user.id }
            });
        }

        const data = {
            ...user.toJSON(),  // Convert user object to JSON and spread its properties
            background_submitted: caregiverDetails ? caregiverDetails.background_submitted : false,
            background_verified: caregiverDetails ? caregiverDetails.background_verified : 'pending',
        };
        // response
        res.status(200).json({
            status: 'success',
            message: 'Your account has been activated',
            token: token,
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

/** user login */
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
        const email = value.email.toLowerCase();

        // check if email exist or not
        let user = await Users.findOne({
            where: {
                email,
                account_status: {
                    [Op.ne]: 'deleted'
                }
            }
        });
        if (!user) {
            return res.status(400).json({
                status: 'error',
                message: 'Please enter valid email id or password'
            });
        }

        // generate token
        const token = generateToken(user);

        if (!user.is_verify) {
            // Generate a 4-digit OTP with numeric characters
            let OTP = await generateOTP();

            // Check if the user_id exist in Verifications
            const verificationEntry = await Verifications.findOne({ where: { user_id: user.id } });

            // Update or create a new entry based on the existence of user_id
            if (verificationEntry) {
                await Verifications.update({ otp: OTP }, { where: { user_id: user.id } });
            } else {
                await Verifications.create({ user_id: user.id, otp: OTP });
            }

            // send otp on email
            await sendEmail(value.email, 'Account Verification', `Your account verification code is : ${OTP}`);

            return res.status(403).json({
                status: 'error',
                error_code: '1002',
                message: 'Please activate your account',
                OTP,
                token
            });
        }

        // check account is active or not
        if (user.account_status !== 'active') {
            return res.status(403).json({
                status: 'error',
                error_code: '1005',
                // message: `Your Account Status is ${user.account_status} Because ${user.account_status_notes}`,
                message: `Account ${user.account_status}, ${user.account_status_notes}`,
            });
        }

        // Compare the provided password with the hashed password in the database
        let password = value.password;
        let isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ status: 'error', message: 'Please enter valid email id or password' });
        }

        user = await Users.findOne({
            attributes: { exclude: ['password'] },
            where: { email: value.email }
        });

        let caregiverDetails = null;
        // check if role is caregiver or not        
        if (user.role === 'caregiver') {
            caregiverDetails = await CareGiverDetails.findOne({
                attributes: ['background_submitted', 'background_verified', 'week_hours', 'qualification', 'language_speak', 'about'],
                where: { user_id: user.id }
            });
        }

        // if patient then store data in stripe
        if (user.role === 'patient') {
            let paymentData = await Payment.findOne({ where: { user_id: user.id } });
            if (!paymentData) {
                let customer = await stripe.customers.create({
                    name: user.full_name,
                    email: user.email,
                    phone: user.mobile_number,
                });

                // Store customer id into payment table
                await Payment.create({
                    user_id: user.id,
                    customer_id: customer.id,
                });
            }
        }

        const data = {
            ...user.toJSON(),  // Convert user object to JSON and spread its properties
            background_submitted: caregiverDetails ? caregiverDetails.background_submitted : false,
            background_verified: caregiverDetails ? caregiverDetails.background_verified : 'pending',
            week_hours: caregiverDetails ? caregiverDetails.week_hours : null,
            qualification: caregiverDetails ? caregiverDetails.qualification : null,
            language_speak: caregiverDetails?.language_speak ? caregiverDetails.language_speak : null,
            about: caregiverDetails ? caregiverDetails.about : '',
        };

        // response
        return res.status(200).json({
            status: 'success',
            message: 'Login successful',
            token,
            data,
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** Forgot password via otp*/
async function forgotPassword(req, res) {
    try {
        const schema = Joi.object().keys({
            email: Joi.string().email().required().messages({
                'string.empty': 'email cannot be an empty field',
                'any.required': 'email is a required field'
            })
        });

        const { value, error } = schema.validate(req.body);

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

        let user = await Users.findOne({ where: { email: value.email } });
        if (!user) {
            return res.status(400).json({
                status: 'error',
                message: 'Email does not exist'
            });
        }

        // generate token
        const token = generateToken(user);

        // Generate a 4-digit OTP with numeric characters
        const OTP = await generateOTP();

        // send reset password otp on email
        await sendEmail(user.email, 'Forgot Password', `Your OTP is : ${OTP}`);

        // get otp and insert into otp collection
        await Verifications.create({
            user_id: user.id,
            otp: OTP
        });

        res.status(200).json({
            status: 'success',
            message: 'OTP sent successfully in your email address',
            token: token
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** Forgot password via  link*/
async function forgotPasswordLink(req, res) {
    try {
        const schema = Joi.object().keys({
            email: Joi.string().email().required().messages({
                'string.empty': 'email cannot be an empty field',
                'any.required': 'email is a required field'
            })
        });

        const { value, error } = schema.validate(req.body);

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

        let user = await Users.findOne({ where: { email: value.email } });
        if (!user) {
            return res.status(400).json({
                status: 'error',
                message: 'Email does not exist'
            });
        }

        // generate token
        const token = generateToken(user);

        // let resetPwdPageLink = `http://d28qzefaa2n2nh.cloudfront.net/reset-password`;
        let resetPwdPageLink = `https://client-dev.caredac.com/reset-password`;

        // send reset password link on email
        await sendEmail(user.email, 'Forgot Password', `Click the link to reset password : ${resetPwdPageLink}?token=${token}`);

        res.status(200).json({
            status: 'success',
            message: 'Reset password link sent successfully in your email address',
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** verify account */
async function verifyOtp(req, res) {
    try {
        const userId = req.userId;
        let user = await Users.findOne({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User does not exist.' });
        }

        let { otp } = req.body;

        let isMatch = await Verifications.findOne({ where: { user_id: user.id, otp } });
        if (!isMatch) {
            return res.status(400).json({
                status: 'error',
                message: 'Please enter valid OTP'
            });
        }
        // update is_verify flag true        
        await Users.update(
            {
                is_verify: true,
            },
            {
                where: { id: userId }
            }
        );

        // delete record from verification table after otp verified
        await Verifications.destroy({
            where: { user_id: userId }
        });

        // generate token
        const token = generateToken(user);

        user = await Users.findOne({
            attributes: { exclude: ['password'] },
            where: { id: userId }
        });

        // response
        res.status(200).json({
            status: 'success',
            message: 'OTP verified',
            token: token
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** resend otp */
async function resendOtp(req, res) {
    try {
        const { email } = req.body;

        let user = await Users.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User does not exist.' });
        }

        // Generate a 4-digit OTP with numeric characters
        const OTP = await generateOTP();

        // send reset password link on email
        await sendEmail(user.email, 'resend otp', `Your OTP is : ${OTP}`);

        await Verifications.update(
            { otp: OTP },
            {
                where: {
                    user_id: user.id
                }
            }
        );

        // generate token
        const token = generateToken(user);

        res.status(200).json({
            status: 'success',
            message: 'OTP sent successfully in your email address',
            token: token
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// reset password via otp
async function resetPassword(req, res) {
    try {
        let user = await Users.findOne({
            where: { id: req.userId }
        });
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User does not exist.' });
        }

        let { password } = req.body;

        await Users.update({ password }, { where: { id: user.id } });

        // generate token
        const token = generateToken(user);

        // response
        res.status(200).json({
            status: 'success',
            message: 'Password reset successfully',
            token: token
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// reset password via link
async function resetPasswordLink(req, res) {
    try {
        let { token } = req.query;
        const userId = await getUserIdFromToken(token);

        let user = await Users.findOne({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User does not exist.' });
        }

        let { password } = req.body;

        await Users.update({ password }, { where: { id: user.id } });

        // generate token
        token = generateToken(user);

        // response
        res.status(200).json({
            status: 'success',
            message: 'Password reset successfully',
            token: token
        });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// change password
async function changePassword(req, res) {
    try {
        let user = await Users.findOne({
            where: { id: req.userId }
        });
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User does not exist.' });
        }

        const { old_password, new_password } = req.body;

        let isMatch = await bcrypt.compare(old_password, user.password);
        if (!isMatch) {
            return res.status(400).json({ status: 'error', message: 'old password does not match.' });
        }

        await Users.update({ password: new_password }, { where: { id: user.id } });

        // generate token
        const token = generateToken(user);

        user = await Users.findOne({
            attributes: { exclude: ['password'] },
            where: { id: user.id }
        });

        // response
        res.status(200).json({
            status: 'success',
            message: 'Password changed successfully',
            token: token,
            data: user
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
        const userId = req.userId;
        let user = await Users.findOne({ where: { id: userId } });
        if (!user) return res.status(404).json({ status: 'error', message: 'User does not exist.' });
        await Users.update({ account_status: 'deleted', account_status_notes: "Your account is deleted" }, { where: { id: userId } });
        if (user && user.role === 'caregiver') {
            let caregiverData = await CareGiverDetails.update({ background_submitted: false, background_verified: 'pending' }, { where: { user_id: userId } });
            caregiverData = await CareGiverDetails.findOne({ where: { user_id: userId } });
            if (caregiverData?.covid_doc && caregiverData?.covid_doc != "" && caregiverData?.covid_doc === null) {
                const fileUrl = caregiverData.covid_doc.replace(/^\//, "");
                deleteImageFromS3(fileUrl);
            }

            if (caregiverData?.first_aid_doc && caregiverData?.first_aid_doc != "" && caregiverData?.first_aid_doc === null) {
                const fileUrl = caregiverData.first_aid_doc.replace(/^\//, "");
                deleteImageFromS3(fileUrl);
            }

            if (caregiverData?.ndis_doc && caregiverData?.ndis_doc != "" && caregiverData?.ndis_doc === null) {
                const fileUrl = caregiverData.ndis_doc.replace(/^\//, "");
                deleteImageFromS3(fileUrl);
            }

            if (caregiverData?.police_doc && caregiverData?.police_doc != "" && caregiverData?.police_doc === null) {
                const fileUrl = caregiverData.police_doc.replace(/^\//, "");
                deleteImageFromS3(fileUrl);
            }

            if (caregiverData?.child_doc && caregiverData?.child_doc != "" && caregiverData?.child_doc === null) {
                const fileUrl = caregiverData.child_doc.replace(/^\//, "");
                deleteImageFromS3(fileUrl);
            }

            if (caregiverData?.visa_doc && caregiverData?.visa_doc != "" && caregiverData?.visa_doc === null) {
                const fileUrl = caregiverData?.visa_doc?.replace(/^\//, "");
                deleteImageFromS3(fileUrl);
            }

            if (caregiverData?.resume && caregiverData?.resume != "" && caregiverData?.resume === null) {
                const fileUrl = caregiverData.resume.replace(/^\//, "");
                deleteImageFromS3(fileUrl);
            }
        }
        return res.status(200).json({ status: 'success', message: 'Account deleted successfully.' });

    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

module.exports = {
    registration,
    verifyAccount,
    login,
    forgotPassword,
    forgotPasswordLink,
    verifyOtp,
    resendOtp,
    resetPassword,
    resetPasswordLink,
    changePassword,
    deleteAccount
};
