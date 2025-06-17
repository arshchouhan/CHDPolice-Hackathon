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
  attachments: [{ 
    name: String, 
    contentType: String, 
    detectedMimeType: String,
    size: Number,
    path: String,
    headers: mongoose.Schema.Types.Mixed,
    originalHash: String, // SHA-256 hash when first received
    currentHash: String,  // Current SHA-256 hash
    analysis: {
      hashes: {
        md5: String,
        sha1: String,
        sha256: String,
        sha512: String
      },
      hashCheck: {
        isKnownMalware: Boolean,
        detections: [{
          source: String,
          positives: Number,
          total: Number,
          scanDate: Date
        }],
        lastChecked: Date
      },
      mitmCheck: {
        suspectedTampering: Boolean,
        indicators: [String],
        riskScore: Number
      },
      riskScore: Number,
      analyzedAt: Date
    }
  }],
  urls: [{ 
    url: String, 
    suspicious: Boolean,
    expanded: String,
    redirects: Boolean,
    domainAge: Number,
    sslValid: Boolean
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
  },
  // New fields for detailed analysis
  detailedAnalysis: {
    headerAnalysis: {
      from: String,
      replyTo: String,
      returnPath: String,
      receivedHeaders: [String],
      messageId: String,
      authenticationResults: String,
      spf: String,
      dkim: String,
      anomalies: [{
        type: String,
        description: String,
        severity: String
      }]
    },
    urlAnalysis: [{
      url: String,
      domain: String,
      isUrlShortener: Boolean,
      expandedUrl: String,
      expandedDomain: String,
      redirectInfo: {
        originalUrl: String,
        finalUrl: String,
        redirects: Boolean,
        originalDomain: String,
        finalDomain: String
      },
      sslInfo: {
        valid: Boolean,
        issuer: mongoose.Schema.Types.Mixed,
        subject: mongoose.Schema.Types.Mixed,
        validFrom: String,
        validTo: String,
        daysRemaining: Number,
        error: String
      },
      domainAgeInfo: {
        age: Number,
        creationDate: String,
        registrar: String,
        error: String
      },
      reputationInfo: {
        reputation: Number,
        lastAnalysisStats: mongoose.Schema.Types.Mixed,
        categories: mongoose.Schema.Types.Mixed,
        totalVotes: mongoose.Schema.Types.Mixed,
        error: String
      },
      riskScore: Number,
      riskLevel: String
    }],
    totalRiskScore: Number,
    riskLevel: String,
    analyzedAt: Date
  }
});

// Create index for faster queries
emailSchema.index({ userId: 1, phishingRisk: 1 });
emailSchema.index({ flagged: 1 });
emailSchema.index({ status: 1 });

module.exports = mongoose.model('Email', emailSchema);
