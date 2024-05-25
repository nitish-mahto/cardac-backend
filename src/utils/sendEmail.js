const nodemailer = require("nodemailer");
const config = require("../config/config");

// function for send notification, otp etc via email
async function sendEmail(email, subject, text) {

    // Create a transporter with your email provider's SMTP settings
    const transporter = nodemailer.createTransport({
        host: config.email_host,
        port: 587, // Use the appropriate port for your email provider
        secure: false, // Set to true if your SMTP server requires SSL/TLS
        auth: {
            user: config.email_user,
            pass: config.email_pass,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });

    // Create an email message
    const mailOptions = {
        from: config.email_user,
        to: email,
        subject: subject,
        text: text,
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}

module.exports = sendEmail;