const Joi = require("joi");

// require and configure dotenv, will load vars in .env in PROCESS.ENV
require("dotenv").config();

// define validation for all the env vars
const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string()
    // .allow(['development', 'production', 'test', 'provision'])
    .default("development"),
  PORT: Joi.number().default(8080),
  JWT_SECRET_KEY: Joi.string()
    .required()
    .description("JWT Secret required to sign"),

  // database connection information
  HOST: Joi.string(),
  USER_NAME: Joi.string(),
  PASSWORD: Joi.string(),
  DATABASE: Joi.string().required().description("Database URL required"),

  // admin credentials
  ADMIN_EMAIL: Joi.string(),
  ADMIN_PASSWORD: Joi.string(),

  // send email information
  USER_EMAIL: Joi.string(),
  EMAIL_PASS: Joi.string(),
  EMAIL_HOST: Joi.string(),
  EMAIL_SERVICE: Joi.string(),
  DEVICE_TOKEN: Joi.string(),

  // AWS credentials
  AWS_BUCKET: Joi.string(),
  AWS_ACCESS_KEY_ID: Joi.string(),
  AWS_SECRET_ACCESS_KEY: Joi.string(),
  AWS_REGION: Joi.string(),

  // Stripe credentials
  AWS_REGIONSTRIPE_PUBLISHABLE_KEY: Joi.string(),
  STRIPE_SECRET_KEY: Joi.string(),
  ENDPOINTSECRET: Joi.string(),
  API_VERSION: Joi.string(),
  SUCCESS_URL: Joi.string(),
  CANCEL_URL: Joi.string(),
})
  .unknown()
  .required();

const { error, value: envVars } = envVarsSchema.validate(process.env);
if (error) {
  throw new Error(`Config validation error: ${error}`);
}

const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  jwtSecret: envVars.JWT_SECRET_KEY,

  // database connection information
  host: envVars.HOST,
  username: envVars.USER_NAME,
  password: envVars.PASSWORD,
  database: envVars.DATABASE,

  //  admin credentials
  admin_email: envVars.ADMIN_EMAIL,
  admin_password: envVars.ADMIN_PASSWORD,

  // send email information
  email_user: envVars.USER_EMAIL,
  email_service: envVars.SERVICE,
  email_pass: envVars.EMAIL_PASS,
  email_host: envVars.EMAIL_HOST,
  device_token: envVars.DEVICE_TOKEN,

  // AWS credentials
  AWS_BUCKET: envVars.AWS_BUCKET,
  AWS_ACCESS_KEY_ID: envVars.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: envVars.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: envVars.AWS_REGION,

  // Stripe credentials
  STRIPE_PUBLISHABLE_KEY: envVars.STRIPE_PUBLISHABLE_KEY,
  STRIPE_SECRET_KEY: envVars.STRIPE_SECRET_KEY,
  ENDPOINTSECRET: envVars.ENDPOINTSECRET,
  API_VERSION: envVars.API_VERSION,

  //  stripe web link
  SUCCESS_URL: envVars.SUCCESS_URL,
  CANCEL_URL: envVars.CANCEL_URL,
};

module.exports = config;
