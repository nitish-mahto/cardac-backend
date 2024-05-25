// Generate a 4-digit OTP
async function generateOTP() {
    let otp = '';
    do {
        otp = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    } while (otp.length !== 4);

    return otp;
}

module.exports = generateOTP;
