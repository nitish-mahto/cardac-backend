const jwt = require('jsonwebtoken');
const config = require('../config/config');

async function getUserIdFromToken(token) {
    return new Promise((resolve, reject) => {
        const secretKey = config.jwtSecret;

        if (!token) {
            reject({ message: 'Unauthorized: Token missing' });
        }

        jwt.verify(token, secretKey, (err, decodedToken) => {
            if (err) {
                reject({ message: 'Invalid token' });
            }

            resolve(decodedToken.id);
        });
    });
}

module.exports = { getUserIdFromToken };
