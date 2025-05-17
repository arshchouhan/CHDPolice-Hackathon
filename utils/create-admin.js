require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

// Admin credentials
const adminCredentials = {
  username: 'admin',
  email: 'admin@emaildetection.com',
  password: 'kugu3940'
};

// Connect to MongoDB
async function connectDB() {
  try {
    console.log('Connecting to MongoDB...');
    const mongoURI = process.env.MONGO_URI;
    
    if (!mongoURI) {
      throw new Error('MONGO_URI environment variable is not set');
    }
    
    console.log('MongoDB URI found');
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB successfully');
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    return false;
  }
}

// Create admin user
async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: adminCredentials.email });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }
    
    // Create new admin
    const newAdmin = new Admin(adminCredentials);
    await newAdmin.save();
    
    console.log('Admin user created successfully!');
    console.log('Username:', adminCredentials.username);
    console.log('Email:', adminCredentials.email);
    console.log('Password: [HIDDEN]');
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Close the connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the script
(async () => {
  const connected = await connectDB();
  if (connected) {
    await createAdmin();
  }
})();
