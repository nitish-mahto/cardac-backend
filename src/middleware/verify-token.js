const jwt = require('jsonwebtoken');
const config = require('../config/config');
const Users = require('../models/user.model');
const Admin = require('../models/admin.model');
const { Op } = require('sequelize');

const authMiddleware = (req, res, next) => {
  const secretKey = config.jwtSecret;
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: Token missing' });
  }

  jwt.verify(token.split(' ')[1], secretKey, async (err, decodedToken) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.userId = decodedToken.id;

    let user = await Users.findOne({
      where: {
        id: req.userId,
        role: {
          [Op.or]: ['caregiver', 'patient']
        }
      }
    });

    if (user && (user.account_status === 'deleted' || user.account_status === 'suspend')) {
      return res.status(401).json({ status: "error", status_code: 1005, message: `Token Expired : Account ${user.account_status}` });
    }

    next();
  });
};

module.exports = authMiddleware;
