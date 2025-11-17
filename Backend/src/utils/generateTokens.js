// src/utils/generateToken.js
import jwt from 'jsonwebtoken';
import config from '../config/config.js';

export const generateToken = (user) => {
  const payload = {
    user: {
      id: user._id,
      role: user.role || 'user'
    }
  };

  return jwt.sign(payload, config.jwtSecret, { expiresIn: '5d' });
};
