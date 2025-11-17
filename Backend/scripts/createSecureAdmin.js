import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Admin from '../src/models/admin.model.js';

// Configure environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Admin credentials
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'SecureAdmin@1234';
const ADMIN_NAME = 'Admin User';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/email_detection');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const createAdmin = async () => {
  try {
    await connectDB();

    // Delete existing admin if exists
    await Admin.deleteMany({ email: ADMIN_EMAIL });
    
    // Create new admin with pre-hashed password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
    
    const admin = new Admin({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword, // Using pre-hashed password
      role: 'admin'
    });

    await admin.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('Email:', ADMIN_EMAIL);
    console.log('Password:', ADMIN_PASSWORD);
    
    // Verify the password can be verified
    const savedAdmin = await Admin.findOne({ email: ADMIN_EMAIL });
    const isMatch = await bcrypt.compare(ADMIN_PASSWORD, savedAdmin.password);
    console.log('Password verification test:', isMatch ? '✅ Success' : '❌ Failed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
};

// Run the script
createAdmin();
