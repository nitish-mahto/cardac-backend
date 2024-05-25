const { v4: uuidv4 } = require('uuid');
const awsConfig = require('../config/aws.config.js');
const Utils = require('./utils.js');
const AWSUtil = require('./aws.util.js');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const uploadEventFilesMiddleware = async (req, res, next) => {
    // const { covid_doc, first_aid_doc, ndis_doc, police_doc, child_doc, visa_doc, resume } = req.files;
    // console.log('req.files:---------------> ', req.files);

    let uploadParams = [];

    if (req.files?.covid_doc) {
        let covid_doc = req.files.covid_doc;
        let file = covid_doc[0];
        const { extension } = Utils.extractFilePath(file.originalname);
        const filename = `${uuidv4()}.${extension}`;
        let storagePath = `/document/${filename}`;
        uploadParams.push({
            Bucket: awsConfig.s3BucketName,
            Key: storagePath.replace('/document/', 'document/'),
            Body: file.buffer,
            ContentType: file.mimetype
        });
        req.body = {
            ...req.body,
            covid_doc: storagePath
        };
    }

    if (req.files?.first_aid_doc) {
        let first_aid_doc = req.files.first_aid_doc;
        let file = first_aid_doc[0];
        const { extension } = Utils.extractFilePath(file.originalname);
        const filename = `${uuidv4()}.${extension}`;
        let storagePath = `/document/${filename}`;
        uploadParams.push({
            Bucket: awsConfig.s3BucketName,
            Key: storagePath.replace('/document/', 'document/'),
            Body: file.buffer,
            ContentType: file.mimetype
        });
        req.body = {
            ...req.body,
            first_aid_doc: storagePath
        };
    }

    if (req.files?.ndis_doc) {
        let ndis_doc = req.files.ndis_doc;
        let file = ndis_doc[0];
        const { extension } = Utils.extractFilePath(file.originalname);
        const filename = `${uuidv4()}.${extension}`;
        let storagePath = `/document/${filename}`;
        uploadParams.push({
            Bucket: awsConfig.s3BucketName,
            Key: storagePath.replace('/document/', 'document/'),
            Body: file.buffer,
            ContentType: file.mimetype
        });
        req.body = {
            ...req.body,
            ndis_doc: storagePath
        };
    }

    if (req.files?.police_doc) {
        let police_doc = req.files.police_doc;
        let file = police_doc[0];
        const { extension } = Utils.extractFilePath(file.originalname);
        const filename = `${uuidv4()}.${extension}`;
        let storagePath = `/document/${filename}`;
        uploadParams.push({
            Bucket: awsConfig.s3BucketName,
            Key: storagePath.replace('/document/', 'document/'),
            Body: file.buffer,
            ContentType: file.mimetype
        });
        req.body = {
            ...req.body,
            police_doc: storagePath
        };
    }

    if (req.files?.child_doc) {
        let child_doc = req.files.child_doc;
        let file = child_doc[0];
        const { extension } = Utils.extractFilePath(file.originalname);
        const filename = `${uuidv4()}.${extension}`;
        let storagePath = `/document/${filename}`;
        uploadParams.push({
            Bucket: awsConfig.s3BucketName,
            Key: storagePath.replace('/document/', 'document/'),
            Body: file.buffer,
            ContentType: file.mimetype
        });
        req.body = {
            ...req.body,
            child_doc: storagePath
        };
    }

    if (req.files?.visa_doc) {
        let visa_doc = req.files.visa_doc;
        let file = visa_doc[0];
        const { extension } = Utils.extractFilePath(file.originalname);
        const filename = `${uuidv4()}.${extension}`;
        let storagePath = `/document/${filename}`;
        uploadParams.push({
            Bucket: awsConfig.s3BucketName,
            Key: storagePath.replace('/document/', 'document/'),
            Body: file.buffer,
            ContentType: file.mimetype
        });
        req.body = {
            ...req.body,
            visa_doc: storagePath
        };
    }

    if (req.files?.resume) {
        let resume = req.files.resume;
        let file = resume[0];
        const { extension } = Utils.extractFilePath(file.originalname);
        const filename = `${uuidv4()}.${extension}`;
        let storagePath = `/document/${filename}`;
        uploadParams.push({
            Bucket: awsConfig.s3BucketName,
            Key: storagePath.replace('/document/', 'document/'),
            Body: file.buffer,
            ContentType: file.mimetype
        });
        req.body = {
            ...req.body,
            resume: storagePath
        };
    }

    if (uploadParams.length > 0) {
        await AWSUtil.uploadMultipleFiles(uploadParams);
    }

    next();
};

const fileUploader = function (fieldname) {
    return async function (req, res, next) {
        const file = req.file;
        if (file) {
            const { extension } = Utils.extractFilePath(file.originalname);
            const filename = `${uuidv4()}.${extension}`;
            const fileStoragePath = `/profile/${filename}`;
            const fileStorageKey = `profile/${filename}`;

            const params = {
                Bucket: awsConfig.s3BucketName,
                Key: fileStorageKey,
                Body: file.buffer,
                ContentType: file.mimetype
            };

            await AWSUtil.uploadFileToS3(params);

            req.body = {
                ...req.body,
                profile_image: fileStoragePath
            };

            next();
        } else {
            next();
        }
    };
};

const fileUploadMiddleware = function (fieldname) {
    return fileUploader(fieldname);
};

const uploadAPKFile = function (apkFieldName) {
    return async function (req, res, next) {
        const file = req.file;
        if (file) {
            const { extension } = Utils.extractFilePath(file.originalname);
            const filename = `${uuidv4()}.${extension}`;
            const fileStoragePath = `/app-files/${filename}`;
            const fileStorageKey = `app-files/${filename}`;

            const params = {
                Bucket: awsConfig.s3BucketName,
                Key: fileStorageKey,
                Body: file.buffer,
                ContentType: file.mimetype
            };

            await AWSUtil.uploadFileToS3(params);

            req.body = {
                ...req.body,
                file: fileStoragePath
            };

            next();
        } else {
            next();
        }
    };
};

const uploadApkMiddleware = function (apkFieldName) {
    return uploadAPKFile(apkFieldName);
};


/** Delete Image */
const deleteImageFromS3 = async (fileKey) => {
    const params = {
        Bucket: awsConfig.s3BucketName,
        Key: fileKey
    };

    try {
        await s3.deleteObject(params).promise();
        console.log(`Deleted old file: -------->${fileKey}`);
    } catch (error) {
        console.error(`Error deleting old file: -------->${fileKey}`, error);
        throw error;
    }
};

module.exports = { uploadEventFilesMiddleware, fileUploadMiddleware, uploadApkMiddleware, deleteImageFromS3 };
