const AWS = require("aws-sdk");
const awsConfig = require("../config/aws.config");

const getS3Object = () => {
    AWS.config.update({
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
        region: awsConfig.s3Region
    })

    const options = {
        signatureVersion: 'v4',
        ACL: 'public-read',
        params: {
            Bucket: awsConfig.s3BucketName
        }
    }
    return new AWS.S3(options);
}

const uploadFileToS3 = (options) => {
    return new Promise((resolve, reject) => {
        let s3 = getS3Object();
        s3.putObject(options, (err, data) => {
            if (!err && data) {
                resolve(data);
            } else {
                console.log("error", err);
                reject(err);
            }
        })
    })
}

const removeFileFromS3 = (options) => {
    return new Promise((resolve, reject) => {
        let s3 = getS3Object();
        s3.deleteObject(options, (err, data) => {
            if (!err && data) {
                resolve(data);
            } else {
                console.log("error", err)
                reject(err);
            }
        })
    })
}

const removeFilesFromS3 = (options) => {
    return new Promise((resolve, reject) => {
        let s3 = getS3Object();
        s3.deleteObjects(options, (err, data) => {
            if (!err && data) {
                console.log("[removeFilesFromS3] success", data)
                resolve(data);
            } else {
                console.log("error", err)
                reject(err);
            }
        })
    })
}

const uploadMultipleFiles = async (uploadParams) => {
    let s3 = getS3Object();
    if (uploadParams.length > 0) {
        const uploadedFiles = await Promise.all(
            uploadParams.map((params) =>
                s3.upload({ Bucket: awsConfig.s3BucketName, ...params }).promise()
            )
        );
    }
}

module.exports = { uploadMultipleFiles, removeFileFromS3, removeFilesFromS3, uploadFileToS3 }