const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  messageId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  from: { 
    type: String, 
    required: true 
  },
  to: { 
    type: String 
  },
  subject: { 
    type: String 
  },
  date: { 
    type: Date 
  },
  body: { 
    type: String 
  },
  scores: {
    header: { type: Number, default: 0 },
    text: { type: Number, default: 0 },
    metadata: { type: Number, default: 0 },
    attachments: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  phishingRisk: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Critical'], 
    default: 'Low' 
  },
  flagged: { 
    type: Boolean, 
    default: false 
  },
  status: { 
    type: String, 
    enum: ['New', 'Reviewed', 'Quarantined', 'Safe'], 
    default: 'New' 
  },
  rawHeaders: { 
    type: String 
  },
  attachmentInfo: [{ 
    name: String, 
    contentType: String, 
    size: Number 
  }],
  urls: [{ 
    url: String, 
    suspicious: Boolean 
  }],
  actionedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Admin' 
  },
  adminNote: { 
    type: String 
  },
  analyzedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Create index for faster queries
emailSchema.index({ userId: 1, phishingRisk: 1 });
emailSchema.index({ flagged: 1 });
emailSchema.index({ status: 1 });

module.exports = mongoose.model('Email', emailSchema);
