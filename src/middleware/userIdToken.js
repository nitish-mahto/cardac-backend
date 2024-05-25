const jwt = require('jsonwebtoken');
const config = require('../config/config');

const userIdToken = (token) => {
    const secretKey = config.jwtSecret;

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: Token missing' });
    }

    jwt.verify(token.split(' ')[1], secretKey, (err, decodedToken) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        req.userId = decodedToken.id;
        return req.userId;
    });
};

module.exports = userIdToken;
