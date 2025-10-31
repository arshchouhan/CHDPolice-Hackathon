// server.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

// MongoDB options
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 60000,
  socketTimeoutMS: 120000,
  connectTimeoutMS: 60000,
  maxPoolSize: 10,
  minPoolSize: 2,
  retryWrites: true,
  w: 'majority',
  wtimeoutMS: 30000,
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, mongoOptions);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 4000;
  const server = app.listen(PORT, () => {
    console.log(`
      =====================================
      🚀 Server running on port ${PORT}
      🌍 Environment: ${process.env.NODE_ENV}
      =====================================
    `);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(() => {
      console.log('HTTP server closed');
      if (mongoose.connection.readyState === 1) {
        mongoose.disconnect().then(() => {
          console.log('MongoDB disconnected');
          process.exit(0);
        });
      } else process.exit(0);
    });
    setTimeout(() => {
      console.error('Force shutdown');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();
