const _ = require('lodash');
const bcrypt = require("bcryptjs");
const Joi = require('joi');
const Users = require('../models/user.model');
const Countries = require('../models/countries.model');
const CareGiverDetails = require('../models/caregiver_details.model');
const LanguageSpeak = require('../models/language_speak.model');
const States = require('../models/states.model');
const Feedback = require('../models/feedback.model');
const ChatUser = require('../models/chat_user.model.js');
const { deleteImageFromS3 } = require("../utils/fileUpload.util.js");
const generateToken = require("../middleware/generate-token");
const generateOTP = require("../utils/generateOTP");
const sendEmail = require("../utils/sendEmail");
const { Op } = require('sequelize');
const FeedbackSummary = require('../models/feedback_summary.model.js');
const Services = require('../models/services.model.js');
const CompanyInfo = require('../models/company_info.model');

// imageUpload
async function imageUpload(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: "error",
                message: "Please Select Image",
            });
        }

        const userId = req.userId;

        let user = await Users.findOne({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "User does not exist.",
            });
        }

        if (req.file && user.profile_image) {
            let file_url = user.profile_image;
            file_url = file_url.replace(/^\//, "");
            deleteImageFromS3(file_url);
        }


        await Users.update(
            {
                profile_image: req.body.profile_image
            },
            {
                where: {
                    id: userId,
                },
            });

        user = await Users.findOne({
            attributes: { exclude: ['password'] },
            where: { id: userId }
        });

        res.status(200).json({
            status: "success",
            message: "Image Uploaded successfully",
            data: user,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            status: "error",
            message: "Internal server error",
        });
    }
}

/** view profile */
async function viewProfile(req, res) {
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
            caregiverDetails = await CareGiverDetails.findOne({
                attributes: ['background_submitted', 'background_verified', 'verified_notes', 'about'],
                where: { user_id: user.id }
            });
        }

        const data = {
            ...user.toJSON(),  // Convert user object to JSON and spread its properties
            background_submitted: caregiverDetails ? caregiverDetails.background_submitted : 'pending',
            background_verified: caregiverDetails ? caregiverDetails.background_verified : 'pending',
            verified_notes: caregiverDetails ? caregiverDetails.verified_notes : '',
            about: caregiverDetails ? caregiverDetails.about : '',
        };

        return res.status(200).json({
            status: 'success',
            message: 'Your Profile',
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

/** edit profile */
async function editProfile(req, res) {
    try {
        const userId = req.userId;

        const schema = Joi.object().keys({
            full_name: Joi.string()
                .regex(/^[a-zA-Z ]*$/, "Characters only allowed in full_name")
                .messages({
                    "string.comments": "Full name should be a type of text",
                }).allow('', null),
            dob: Joi.string().messages({
                "any.required": "dob is a required field",
            }).allow('', null),
            mobile_number: Joi.string()
                .trim()
                .regex(/^[+0-9 ]{3,15}$/, { name: 'mobile_number' }) // validate a common phone number format
                .allow('', null)
                .optional()
                .messages({
                    'string.pattern.base': 'Invalid mobile number format'
                }).allow('', null),
            emergency_mobile_number: Joi.string()
                .trim()
                .regex(/^[+0-9 ]{3,15}$/, { name: 'emergency_mobile_number' }) // validate a common phone number format
                .allow('', null)
                .optional()
                .messages({
                    'string.pattern.base': 'Invalid emergency mobile number format'
                }),
            gender: Joi.string().messages({
                "string.empty": "gender cannot be an empty field",
                "any.required": "gender is a required field",
            }),

            address1: Joi.string().allow('', null),
            address2: Joi.string().allow('', null),
            country: Joi.string().allow(''),
            state: Joi.string().allow(''),
            city: Joi.string().allow(''),
            pin_code: Joi.string().allow(''),
            profile_image: Joi.string().allow(''),
            lat_long: Joi.string().allow(''),
        });

        let { value, error } = schema.validate({ ...req.body });

        if (error) {
            return res.status(400).json({
                status: "error",
                message: "Invalid request data",
                data: {
                    original: error._object,
                    details: _.map(error.details, ({ message, type }) => ({
                        message: message.replace(/['"]/g, ""),
                        type,
                    })),
                },
            });
        }

        let user = await Users.findOne({
            where: { id: userId }
        });

        let recordUpdated = 0;

        if (req.file && user.profile_image) {
            const fileUrl = user.profile_image.replace(/^\//, "");
            deleteImageFromS3(fileUrl);

            // Update the user's profile with the new image
            [recordUpdated] = await Users.update({ ...value, profile_image: value.profile_image }, {
                where: {
                    id: userId,
                },
            });
        } else {
            // Update the user's profile without changing the profile image
            [recordUpdated] = await Users.update({ ...value }, {
                where: {
                    id: userId,
                },
            });
        }

        if (recordUpdated === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'User does not exist or not authorized to update.',
            });
        }


        user = await Users.findOne({
            attributes: { exclude: ['password'] },
            where: { id: userId }
        });

        // response
        res.status(200).json({
            status: "success",
            message: "Profile updated successfully",
            data: user,
        });
    } catch (error) {
        console.log("Error :", error || error.message);
        return res.status(500).json({
            status: "error",
            message: error.message,
        });
    }
}

/** name of countries  */
async function countries(req, res) {
    try {
        let countries = await Countries.findAll();

        return res.status(200).json({
            status: 'success',
            message: 'Countries name',
            data: countries,
        });
    } catch (error) {
        console.log("Error :", error || error.message);
        return res.status(500).json({
            status: "error",
            message: error.message,
        });
    }
}

/** name of states  */
async function states(req, res) {
    try {
        let countryId = req.params.id;
        let states = await States.findAll({ where: { country_id: countryId } });

        return res.status(200).json({
            status: 'success',
            message: 'States name',
            data: states,
        });
    } catch (error) {
        console.log("Error :", error || error.message);
        return res.status(500).json({
            status: "error",
            message: error.message,
        });
    }
}

/** list of speaking languages  */
async function speakLanguages(req, res) {
    try {
        let languages = await LanguageSpeak.findAll();

        return res.status(200).json({
            status: 'success',
            message: 'Speaking languages',
            data: languages,
        });
    } catch (error) {
        console.log("Error :", error || error.message);
        return res.status(500).json({
            status: "error",
            message: error.message,
        });
    }
}

// find user for chat implementation
async function chatUsers(req, res) {
    try {
        const userId = req.userId;
        const receiverId = req.params.id;

        let user = await Users.findOne({
            where: { id: userId }
        });

        if (!user) return res.status(404).json({ status: 'error', message: 'User does not exist.' });

        const { last_msg, channel } = req.body;
        let sender_id = `[${userId},${receiverId}]`;
        let reciver_id = `[${receiverId},${userId}]`;

        let chatUser = await ChatUser.findOne({
            where: {
                [Op.or]: [
                    { users_id: sender_id },
                    { users_id: reciver_id }
                ]
            }
        });

        let newData;

        if (chatUser) {
            newData = await ChatUser.update({ last_msg }, {
                where: {
                    [Op.or]: [
                        { users_id: sender_id },
                        { users_id: reciver_id }
                    ]
                }
            });
        } else {
            newData = await ChatUser.create({ users_id: sender_id, last_msg, channel });
        }

        newData = await ChatUser.findOne({
            where: {
                [Op.or]: [
                    { users_id: sender_id },
                    { users_id: reciver_id }
                ]
            }
        });

        return res.status(200).json({ status: 'error', message: `User's Chat data`, data: newData });


    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// get user's data
async function getChatUsers(req, res) {
    try {
        const userId = req.userId;

        const chatUsers = await ChatUser.findAll({
            where: {
                users_id: {
                    [Op.like]: `%${userId}%`
                }
            }
        });

        const uniqueUserIds = Array.from(new Set([].concat(...chatUsers.map(user => JSON.parse(user.users_id)))));
        const users = await Users.findAll({
            where: {
                id: {
                    [Op.in]: uniqueUserIds
                }
            }
        });

        const userMap = {};
        users.forEach(user => {
            userMap[user.id] = user;
        });

        const data = chatUsers.map(chatUser => {
            const userIds = JSON.parse(chatUser.users_id);
            const mainUserId = userIds.find(id => id !== userId);
            const isMainUser = false;
            // const isMainUser = mainUserId === 29;

            const fullNameKey = isMainUser ? 'user_full_name' : 'receiver_full_name';
            const profileImageKey = isMainUser ? 'user_profile_image' : 'receiver_profile_image';
            const accountStatus = isMainUser ? 'user_account_status' : 'receiver_account_status';

            return {
                ...chatUser.toJSON(),
                [fullNameKey]: userMap[mainUserId].full_name,
                [profileImageKey]: userMap[mainUserId].profile_image,
                [accountStatus]: userMap[mainUserId].account_status
            };
        });

        return res.status(200).json({ status: 'success', message: 'ChatUser Data', data });


    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// view services
async function viewAllServices(req, res) {
    try {
        const services = await Services.findAll({});
        return res.status(200).json({ status: 'success', message: `Services list`, data: services });
    } catch (error) {
        console.log('Error :', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

// view my services
async function viewServices(req, res) {
    try {
        let userId = req.userId;
        const servicesData = await Users.findOne({ attributes: ['services'], where: { id: userId } });

        // Split the services string into an array
        const servicesArray = servicesData.services.split(',');

        // Map the array to the desired format
        const formattedServices = servicesArray.map(service => ({ services: service.trim() }));

        return res.status(200).json({
            status: 'success',
            message: `Services list`,
            data: formattedServices
        });
    } catch (error) {
        console.log('Error:', error || error.message);
        return res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
}

/** add/update services */
async function updateServices(req, res) {
    try {
        let userId = req.userId;
        const { services } = req.body;
        await Users.update({ services }, { where: { id: userId } });

        return res.status(200).json({ status: 'success', message: `Services added Successfully` });
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

module.exports = {
    imageUpload,
    viewProfile,
    editProfile,
    countries,
    states,
    speakLanguages,
    chatUsers,
    getChatUsers,
    viewServices,
    viewAllServices,
    updateServices,

    viewCompanyGuidelines,
    viewCompanyPolicies,
    viewCompanyTerms,
    viewCompanyTrustSafety
}
