import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import Admin from '../src/models/Admin.js';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file in the root directory
const envPath = join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

// Verify required environment variables
if (!process.env.MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI is not defined in your .env file');
  console.log('Please make sure you have a .env file in your project root with MONGODB_URI defined');
  process.exit(1);
}

console.log('🔍 Environment variables loaded');
console.log('MongoDB URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set');

const resetAdminPassword = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    const adminEmail = 'arshchouhan004@gmail.com';
    const newPassword = 'admin123'; // New password to set
    
    // Find the admin user
    const admin = await Admin.findOne({ email: adminEmail });
    
    if (!admin) {
      console.log(`❌ No admin found with email: ${adminEmail}`);
      process.exit(1);
    }

    // Update the password (the pre-save hook will hash it)
    admin.password = newPassword;
    await admin.save();
    
    console.log('✅ Password updated successfully!');
    console.log(`Email: ${adminEmail}`);
    console.log(`New Password: ${newPassword}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

resetAdminPassword();
