import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const adminSchema = new mongoose.Schema({
  email: String,
  password: String
});

const Admin = mongoose.model('Admin', adminSchema);

async function createTestAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ MongoDB connected');

    const testCredentials = {
      email: 'arshchouhan004@gmail.com',
      password: 'arsh123'
    };

    console.log('Checking for admin with email:', testCredentials.email);
    const existingAdmin = await Admin.findOne({ email: testCredentials.email });
    
    if (!existingAdmin) {
      const admin = new Admin(testCredentials);
      await admin.save();
      console.log('✅ Test admin created successfully with:');
      console.log('Email:', testCredentials.email);
      console.log('Password:', testCredentials.password);
    } else {
      console.log('✅ Test admin already exists:');
      console.log('Email:', existingAdmin.email);
      console.log('Password:', existingAdmin.password);
    }

    // Verify admin exists
    const verifyAdmin = await Admin.findOne({ email: testCredentials.email });
    console.log('\nVerification:');
    console.log('Admin found in database:', !!verifyAdmin);
    console.log('Admin details:', verifyAdmin);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createTestAdmin();
