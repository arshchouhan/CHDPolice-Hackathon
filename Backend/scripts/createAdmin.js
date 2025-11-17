import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Admin from '../src/models/Admin.js';

dotenv.config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const adminEmail = 'admin@example.com';
    let admin = await Admin.findOne({ email: adminEmail });
    
    if (admin) {
      console.log('ℹ️ Admin already exists:', adminEmail);
      console.log('You can use these credentials to login:');
      console.log('Email:', adminEmail);
      console.log('Password: admin123');
    } else {
      // Create new admin
      admin = new Admin({
        name: 'Admin User',
        email: adminEmail,
        password: 'admin123', // Will be hashed by pre-save hook
        role: 'admin'
      });

      await admin.save();
      console.log('✅ Admin user created successfully!');
      console.log('You can now login with these credentials:');
      console.log('Email:', adminEmail);
      console.log('Password: admin123');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdmin();
