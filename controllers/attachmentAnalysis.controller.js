const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const Email = require('../models/Email');

// Known hash databases for malware detection
const HASH_DATABASES = {
    VIRUSTOTAL_API: process.env.VIRUSTOTAL_API_KEY,
    // Add other hash databases as needed
};

/**
 * Utility functions for attachment analysis
 */

/**
 * Calculate multiple hashes for a file
 * @param {Buffer} fileBuffer - File content buffer
 * @returns {Object} Object containing different hash values
 */
const calculateHashes = (fileBuffer) => {
        return {
            md5: crypto.createHash('md5').update(fileBuffer).digest('hex'),
            sha1: crypto.createHash('sha1').update(fileBuffer).digest('hex'),
            sha256: crypto.createHash('sha256').update(fileBuffer).digest('hex'),
            sha512: crypto.createHash('sha512').update(fileBuffer).digest('hex')
        };
    }

/**
 * Check file hash against known malware databases
 * @param {Object} hashes - Object containing file hashes
 * @returns {Object} Threat assessment results
 */
const checkHashDatabases = async (hashes) => {
        const results = {
            isKnownMalware: false,
            detections: [],
            lastChecked: new Date()
        };

        try {
            if (HASH_DATABASES.VIRUSTOTAL_API) {
                const vtResponse = await axios.get(`https://www.virustotal.com/vtapi/v2/file/report`, {
                    params: {
                        apikey: HASH_DATABASES.VIRUSTOTAL_API,
                        resource: hashes.md5
                    }
                });

                if (vtResponse.data.response_code === 1) {
                    results.isKnownMalware = vtResponse.data.positives > 0;
                    results.detections.push({
                        source: 'VirusTotal',
                        positives: vtResponse.data.positives,
                        total: vtResponse.data.total,
                        scanDate: vtResponse.data.scan_date
                    });
                }
            }
        } catch (error) {
            console.error('Error checking hash databases:', error);
        }

        return results;
    }

/**
 * Detect potential MITM tampering by comparing attachment metadata
 * @param {Object} attachment - Attachment object with metadata
 * @returns {Object} MITM analysis results
 */
const detectMitmTampering = async (attachment) => {
        const results = {
            suspectedTampering: false,
            indicators: [],
            riskScore: 0
        };

        // Check for common MITM indicators
        if (attachment.headers) {
            // Check Content-Type mismatch
            if (attachment.headers['content-type'] !== attachment.detectedMimeType) {
                results.indicators.push('Content-Type mismatch');
                results.riskScore += 25;
            }

            // Check Content-Length mismatch
            const declaredSize = parseInt(attachment.headers['content-length']);
            const actualSize = attachment.size;
            if (declaredSize && Math.abs(declaredSize - actualSize) > 100) { // Allow small differences
                results.indicators.push('Content-Length mismatch');
                results.riskScore += 25;
            }

            // Check for suspicious headers
            const suspiciousHeaders = ['x-proxy-id', 'via', 'forwarded'];
            for (const header of suspiciousHeaders) {
                if (attachment.headers[header]) {
                    results.indicators.push(`Suspicious header: ${header}`);
                    results.riskScore += 15;
                }
            }
        }

        // Check file integrity
        if (attachment.originalHash && attachment.currentHash) {
            if (attachment.originalHash !== attachment.currentHash) {
                results.indicators.push('File hash mismatch');
                results.riskScore += 35;
            }
        }

        results.suspectedTampering = results.riskScore >= 50;
        return results;
    }

/**
 * Analyze attachment for potential threats
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const analyzeAttachment = async (req, res) => {
        try {
            const { emailId, attachmentId } = req.params;
            const email = await Email.findById(emailId);

            if (!email) {
                return res.status(404).json({
                    success: false,
                    message: 'Email not found'
                });
            }

            const attachment = email.attachments.id(attachmentId);
            if (!attachment) {
                return res.status(404).json({
                    success: false,
                    message: 'Attachment not found'
                });
            }

            // Calculate current hashes
            const fileBuffer = await fs.readFile(attachment.path);
            const currentHashes = this.calculateHashes(fileBuffer);

            // Store current hash if original hash doesn't exist
            if (!attachment.originalHash) {
                attachment.originalHash = currentHashes.sha256;
            }
            attachment.currentHash = currentHashes.sha256;

            // Perform analysis
            const [hashCheck, mitmCheck] = await Promise.all([
                this.checkHashDatabases(currentHashes),
                this.detectMitmTampering(attachment)
            ]);

            // Calculate overall risk score
            const riskScore = Math.min(100, Math.round(
                (hashCheck.isKnownMalware ? 100 : 0) * 0.6 + // 60% weight for known malware
                mitmCheck.riskScore * 0.4 // 40% weight for MITM indicators
            ));

            // Update attachment analysis results
            attachment.analysis = {
                hashes: currentHashes,
                hashCheck,
                mitmCheck,
                riskScore,
                analyzedAt: new Date()
            };

            await email.save();

            return res.status(200).json({
                success: true,
                message: 'Attachment analyzed successfully',
                analysis: attachment.analysis
            });

        } catch (error) {
            console.error('Error analyzing attachment:', error);
            return res.status(500).json({
                success: false,
                message: 'Error analyzing attachment',
                error: error.message
            });
        }
    }

module.exports = {
    analyzeAttachment,
    calculateHashes,
    checkHashDatabases,
    detectMitmTampering
};
