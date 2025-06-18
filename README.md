# Crime Scene Image Analysis & Reconstruction Assistant

An AI-powered forensic analysis platform developed for the Chandigarh Police Cyberthon. The system provides automated crime scene analysis, event reconstruction, and digital courtroom presentation capabilities.

## Key Features

- **AI-Powered Scene Analysis**
  - State-of-the-art BLIP-2 vision-language model integration
  - Automated caption generation from crime scene images
  - Comprehensive visual evidence interpretation

- **Semantic Matching & Analysis**
  - SBERT-based forensic fact matching
  - Contextual data mapping
  - Bias-free evidence evaluation

- **Event Reconstruction**
  - Timeline-based scene reconstruction
  - Narrated event sequences
  - Sub-minute processing time with GPU acceleration

- **Digital Presentation**
  - Courtroom-ready visualizations
  - 2D/3D scene layout (planned)
  - Interactive evidence presentation

## Technology Stack

- **Vision AI**: BLIP-2 Vision-Language Model
- **NLP**: Sentence-BERT (SBERT)
- **Processing**: GPU-accelerated computing
- **Architecture**: Modular, field-ready design
- **Deployment**: Mobile and tablet compatible

## Technical Architecture

### Server Architecture
- **Route Handling**: Express.js with modular route definitions
- **Authentication**: JWT-based middleware with role-based access control
- **Headers**: 
  - CORS configuration for secure cross-origin requests
  - Content-Type validation for JSON and multipart data
  - Authorization header parsing for JWT tokens
  - Custom headers for tracking request sources

### Data Management
- **Timestamps**: 
  - ISO 8601 format with UTC timezone
  - Created/Updated timestamps for all records
  - Request processing time tracking
  - Email analysis duration metrics

### File Handling
- **Hashing**: 
  - SHA-256 for file integrity verification
  - MD5 checksums for quick duplicate detection
  - Unique file identifiers based on content hash

### Sandbox Environment
- **URL Analysis**:
  - Automated extraction of URLs from emails
  - Risk scoring based on domain reputation
  - Pattern matching for suspicious URL structures

- **Browser Automation**:
  - Headless Chrome for URL analysis
  - Screenshot capture of suspicious pages
  - DOM analysis for malicious patterns
  - Network request monitoring
  - Isolation using Docker containers

- **Analysis Pipeline**:
  1. URL extraction and initial scoring
  2. Domain reputation check
  3. Automated browser analysis
  4. Screenshot and DOM capture
  5. Network behavior analysis
  6. Final risk assessment report

## Implementation Approach

1. **Visual Understanding Module**
   - BLIP-2 integration for image caption generation
   - Automated feature extraction
   - Multi-angle scene interpretation

2. **Semantic Reasoning Module**
   - SBERT-based forensic fact matching
   - Contextual evidence mapping
   - Pattern recognition and analysis

3. **Narrative Generation Module**
   - Structured timeline creation
   - Before-During-After event sequencing
   - Automated report generation

4. **Field Deployment**
   - Mobile-first design
   - Offline capability
   - Secure data handling

## Future Requirements

### Additional Datasets

- High-quality forensic image collections
- Crime scene metadata (blood spatter, weapons, GPS)
- Multi-language forensic vocabularies
- Chain-of-custody documentation
- Field deployment imagery

### System Enhancements

- 3D scene reconstruction capabilities
- Real-time drone feed integration
- Body camera compatibility
- Advanced evidence chain tracking
- Multi-device synchronization

### Training & Integration

- Role-based microlearning modules
- Field officer training programs
- Legal expert system guides
- Department integration protocols
- Performance monitoring tools

## Team Information

### Project Details
- **Team Name**: Rohan Raghav
- **Institution**: Army Institute of Technology, Pune
- **Category**: Usecase
- **Competition**: Cyberthon

### Team Members
- Rohan Raghav (rohanraghav81@gmail.com)
- Tarveen Kaur (tarveenkaur384@gmail.com)
- Siddharth (sidd24472@gmail.com)
- Sonu Kumar (soinfirad0299@gmail.com)

### Collaboration
- Original project developed for Cyberthon Hackathon
- Open for future collaboration with Chandigarh Police
- IP rights sharing agreement accepted

## Acknowledgments

- Chandigarh Police Department
- Army Institute of Technology, Pune
- Open-source AI/ML community