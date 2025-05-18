const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  googleId: { type: String, sparse: true },
  profilePicture: { type: String },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  // Gmail integration fields
  gmail_access_token: { type: String },
  gmail_refresh_token: { type: String },
  gmail_token_expiry: { type: Date },
  gmail_connected: { type: Boolean, default: false },
  last_email_sync: { type: Date }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);
