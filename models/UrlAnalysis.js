/**
 * URL Analysis Model
 * 
 * Stores information about URLs that have been analyzed or are pending analysis
 */

const mongoose = require('mongoose');

const urlAnalysisSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    trim: true
  },
  email_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Email',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  reasons: {
    type: [String],
    default: []
  },
  processing_started: {
    type: Date,
    default: null
  },
  completed_at: {
    type: Date,
    default: null
  },
  failed_at: {
    type: Date,
    default: null
  },
  error: {
    type: String,
    default: null
  },
  analysis_result: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Create index on URL for faster lookups
urlAnalysisSchema.index({ url: 1 });
urlAnalysisSchema.index({ status: 1 });
urlAnalysisSchema.index({ email_id: 1 });

const UrlAnalysis = mongoose.model('UrlAnalysis', urlAnalysisSchema);

module.exports = UrlAnalysis;
