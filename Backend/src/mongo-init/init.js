// MongoDB initialization script
db = db.getSiblingDB('email_detection');

// Create collections if they don't exist
db.createCollection('users');
db.createCollection('emails');
db.createCollection('url_analysis');

// Create indexes for better performance
db.users.createIndex({ "email": 1 }, { unique: true });
db.emails.createIndex({ "userId": 1 });
db.emails.createIndex({ "messageId": 1 }, { unique: true });
db.url_analysis.createIndex({ "url": 1, "email_id": 1 });
db.url_analysis.createIndex({ "status": 1 });
db.url_analysis.createIndex({ "user_id": 1 });

// Create TTL index for URL analysis to automatically delete old records after 30 days
db.url_analysis.createIndex({ "created_at": 1 }, { expireAfterSeconds: 2592000 });
