const _ = require('lodash');
const Joi = require('joi');
const MobileApplication = require('../models/mobile_application.model');
const { deleteImageFromS3 } = require("../utils/fileUpload.util.js");
const Admin = require('../models/admin.model');

/** Add Application */
async function addApplication(req, res) {
    try {
        const adminId = req.userId;
        const admin = await Admin.findOne({ where: { id: adminId } });
        if (!admin) { return res.status(403).json({ status: 'error', message: 'Only admin can add or upload mobile application details.' }); }

        const schema = Joi.object().keys({
            deviceType: Joi.string().allow('', null),
            link: Joi.string().allow('', null),
            file: Joi.string().allow('', null),
            title: Joi.string().allow('', null),
            notes: Joi.string().allow('', null),
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

        let newApplication = await MobileApplication.create({ ...value });

        // response
        res.status(200).json({
            status: "success",
            message: "Application Added successfully",
            application: newApplication
        });
    } catch (error) {
        console.log("Error :", error || error.message);
        return res.status(500).json({
            status: "error",
            message: error.message,
        });
    }
}

async function viewApplication(req, res) {
    try {
        let applications = await MobileApplication.findAll({});

        // response
        res.status(200).json({
            status: "success",
            message: "Applications fetch successfully",
            application: applications
        });
    } catch (error) {
        console.log("Error :", error || error.message);
        return res.status(500).json({
            status: "error",
            message: error.message,
        });
    }
}

async function deleteApplication(req, res) {
    try {
        let applicationId = req.params.id;
        const adminId = req.userId;
        const admin = await Admin.findOne({ where: { id: adminId } });
        if (!admin) { return res.status(403).json({ status: 'error', message: 'Only admin can add or upload mobile application details.' }); }

        let applications = await MobileApplication.findOne({ where: { id: applicationId } });
        if (!applications) { return res.status(404).json({ status: "success", message: "Applications does not exist", }); }

        if (applications?.deviceType == 'android' && applications?.file != "") {
            if (applications?.file) {
                const fileUrl = await applications?.file?.replace(/^\//, "");
                if (fileUrl) {
                    await deleteImageFromS3(fileUrl);
                }

            }

        }

        await MobileApplication.destroy({ where: { id: applicationId } });

        // response
        res.status(200).json({
            status: "success",
            message: "Applications deleted successfully",
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
    addApplication,
    viewApplication,
    deleteApplication
}
