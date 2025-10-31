import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const adminSchema = new mongoose.Schema(
  {
    username: { 
      type: String, 
      required: [true, 'Username is required'] 
    },
    email: { 
      type: String, 
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    password: { 
      type: String,
      // Only require password if not using OAuth
      required: function() { return !this.googleId; }
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    profilePicture: {
      type: String,
      default: ''
    },
    lastLogin: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    },
    role: {
      type: String,
      enum: ['admin', 'superadmin'],
      default: 'admin'
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving if it was modified
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Static method to find or create admin from Google profile
adminSchema.statics.findOrCreate = async function(profile) {
  let admin = await this.findOne({ email: profile.email });
  
  if (!admin) {
    // If admin doesn't exist, create a new one (optional: you might want to restrict this)
    admin = new this({
      username: profile.name || profile.email.split('@')[0],
      email: profile.email,
      googleId: profile.sub,
      profilePicture: profile.picture,
      lastLogin: new Date()
    });
    
    await admin.save();
  } else if (!admin.googleId) {
    // If admin exists but doesn't have googleId, update it
    admin.googleId = profile.sub;
    admin.profilePicture = profile.picture || admin.profilePicture;
    admin.lastLogin = new Date();
    await admin.save();
  }
  
  return admin;
};

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
