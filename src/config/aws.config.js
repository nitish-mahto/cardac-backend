const config = require("./config.js");

const awsConfig = {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    s3Region: config.AWS_REGION,
    s3BucketName: config.AWS_BUCKET,
    signedTTL: 3600,
};

module.exports = awsConfig;

