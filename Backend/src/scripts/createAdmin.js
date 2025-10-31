import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import Admin from '../models/Admin.js';

// Get the current directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Admin credentials
const ADMIN_EMAIL = 'arshchouhan004@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // Fallback to 'admin123' if not set

// MongoDB connection string
const MONGO_URI = 'mongodb+srv://arshchouhan004:arsh246@phishingcluster.i4kyugx.mongodb.net/email_detection?retryWrites=true&w=majority';

// Create admin user
const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB...');

    // Check if admin already exists
    let admin = await Admin.findOne({ email: ADMIN_EMAIL });
    
    if (admin) {
      console.log('Admin user already exists. Updating admin details...');
      admin.role = 'admin';
      admin.isActive = true;
      await admin.save();
      console.log('Admin user updated successfully!');
    } else {
      // Create new admin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      admin = new Admin({
        username: 'admin',
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        isActive: true
      });
      
      await admin.save();
      console.log('Admin user created successfully!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

// Run the function and handle any uncaught errors
createAdminUser().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
