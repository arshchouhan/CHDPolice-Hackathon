// createAdminUser.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from './src/models/Admin.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'admin123'; // Default password
const ADMIN_NAME = 'Admin User';

// Database connection
const connectDB = async () => {
  try {
    // Use the same connection string as in your server.js
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/email_detection', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const createAdmin = async () => {
  try {
    await connectDB();
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: ADMIN_EMAIL });
    if (existingAdmin) {
      console.log(`ℹ️ Admin with email ${ADMIN_EMAIL} already exists`);
      console.log('You can use these credentials to login:');
      console.log(`Email: ${ADMIN_EMAIL}`);
      console.log('Password: [the password you set previously]');
      process.exit(0);
    }

    // Create new admin
    const admin = new Admin({
      username: 'admin',  // Adding required username field
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD, // Will be hashed by the pre-save hook
      role: 'admin'
    });

    await admin.save();
    console.log('✅ Admin user created successfully!');
    console.log('You can now login with these credentials:');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
};

createAdmin();
