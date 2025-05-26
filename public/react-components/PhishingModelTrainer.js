/**
 * Phishing Model Trainer Component
 * 
 * This component allows administrators to upload a Kaggle dataset
 * and train a custom phishing detection model instead of using Gemini API.
 */

class PhishingModelTrainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: false,
      isModelTrained: false,
      selectedFile: null,
      uploadProgress: 0,
      message: null,
      error: null,
      modelStatus: 'unknown' // 'unknown', 'trained', 'untrained', 'training'
    };
    
    this.fileInputRef = React.createRef();
  }
  
  componentDidMount() {
    this.checkModelStatus();
  }
  
  // Check if the model is already trained
  checkModelStatus = async () => {
    try {
      this.setState({ isLoading: true });
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
      const response = await fetch(`${baseUrl}/api/phishing-model/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      this.setState({
        isModelTrained: data.isModelTrained,
        modelStatus: data.isModelTrained ? 'trained' : 'untrained',
        message: data.message,
        isLoading: false
      });
      
    } catch (error) {
      console.error('Error checking model status:', error);
      this.setState({
        error: `Failed to check model status: ${error.message}`,
        isLoading: false
      });
    }
  };
  
  // Handle file selection
  handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      this.setState({
        selectedFile: file,
        error: null,
        message: `Selected file: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`
      });
    }
  };
  
  // Handle file upload and model training
  handleTrainModel = async () => {
    const { selectedFile } = this.state;
    
    if (!selectedFile) {
      this.setState({ error: 'Please select a dataset file first' });
      return;
    }
    
    try {
      this.setState({
        isLoading: true,
        modelStatus: 'training',
        uploadProgress: 0,
        message: 'Uploading dataset and starting training...',
        error: null
      });
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const formData = new FormData();
      formData.append('dataset', selectedFile);
      
      const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
      
      const response = await fetch(`${baseUrl}/api/phishing-model/train`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      this.setState({
        message: data.message,
        isLoading: false,
        uploadProgress: 100,
        selectedFile: null
      });
      
      // Clear file input
      if (this.fileInputRef.current) {
        this.fileInputRef.current.value = '';
      }
      
      // Check status again after a delay to see if training completed
      setTimeout(this.checkModelStatus, 10000);
      
    } catch (error) {
      console.error('Error training model:', error);
      this.setState({
        error: `Failed to train model: ${error.message}`,
        isLoading: false,
        modelStatus: 'untrained'
      });
    }
  };
  
  render() {
    const { isLoading, isModelTrained, selectedFile, uploadProgress, message, error, modelStatus } = this.state;
    
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-lg">
        <div className="flex items-center mb-4">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-2 rounded-lg mr-3">
            <i className="fas fa-brain text-white"></i>
          </div>
          <div>
            <h3 className="text-white font-medium">Custom Phishing Detection Model</h3>
            <p className="text-blue-300 text-xs">Train with your own Kaggle dataset</p>
          </div>
        </div>
        
        {/* Model Status */}
        <div className="mb-6 bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300">Model Status:</span>
            {modelStatus === 'trained' && (
              <span className="text-green-400 bg-green-900/30 px-2 py-1 rounded-full text-xs">
                <i className="fas fa-check-circle mr-1"></i>
                Trained
              </span>
            )}
            {modelStatus === 'untrained' && (
              <span className="text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded-full text-xs">
                <i className="fas fa-exclamation-circle mr-1"></i>
                Not Trained
              </span>
            )}
            {modelStatus === 'training' && (
              <span className="text-blue-400 bg-blue-900/30 px-2 py-1 rounded-full text-xs">
                <i className="fas fa-spinner fa-spin mr-1"></i>
                Training
              </span>
            )}
            {modelStatus === 'unknown' && (
              <span className="text-gray-400 bg-gray-700/30 px-2 py-1 rounded-full text-xs">
                <i className="fas fa-question-circle mr-1"></i>
                Unknown
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-400">
            {isModelTrained 
              ? 'Your custom phishing detection model is trained and ready to use.' 
              : 'Upload a Kaggle phishing email dataset to train a custom model.'}
          </p>
        </div>
        
        {/* File Upload */}
        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Upload Kaggle Dataset (CSV or Excel)
          </label>
          <div className="flex items-center">
            <input
              type="file"
              ref={this.fileInputRef}
              onChange={this.handleFileChange}
              accept=".csv,.xlsx,.xls"
              className="hidden"
              disabled={isLoading}
            />
            <button
              onClick={() => this.fileInputRef.current.click()}
              disabled={isLoading}
              className={`flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-l-md transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <i className="fas fa-file-upload mr-2"></i>
              Select Dataset
            </button>
            <button
              onClick={this.handleTrainModel}
              disabled={isLoading || !selectedFile}
              className={`bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-r-md transition-colors ${isLoading || !selectedFile ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Training...
                </>
              ) : (
                <>
                  <i className="fas fa-brain mr-2"></i>
                  Train Model
                </>
              )}
            </button>
          </div>
          {selectedFile && (
            <p className="mt-2 text-sm text-blue-300">
              <i className="fas fa-file-alt mr-1"></i>
              {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
            </p>
          )}
        </div>
        
        {/* Progress Bar */}
        {isLoading && (
          <div className="mb-4">
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {uploadProgress < 100 
                ? 'Uploading dataset...' 
                : 'Training model (this may take several minutes)...'}
            </p>
          </div>
        )}
        
        {/* Messages */}
        {message && (
          <div className="mb-4 bg-blue-900/20 border border-blue-800/30 text-blue-300 p-3 rounded-lg">
            <p className="text-sm">
              <i className="fas fa-info-circle mr-2"></i>
              {message}
            </p>
          </div>
        )}
        
        {error && (
          <div className="mb-4 bg-red-900/20 border border-red-800/30 text-red-300 p-3 rounded-lg">
            <p className="text-sm">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              {error}
            </p>
          </div>
        )}
        
        {/* Info Box */}
        <div className="mt-6 bg-indigo-900/20 border border-indigo-800/30 text-indigo-300 p-4 rounded-lg">
          <h4 className="font-medium mb-2 flex items-center">
            <i className="fas fa-lightbulb mr-2"></i>
            Why use a custom model?
          </h4>
          <ul className="text-sm space-y-2">
            <li className="flex items-start">
              <i className="fas fa-check-circle mt-1 mr-2 text-green-400"></i>
              <span>No API key required, works offline</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-check-circle mt-1 mr-2 text-green-400"></i>
              <span>Train on domain-specific phishing examples</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-check-circle mt-1 mr-2 text-green-400"></i>
              <span>Full control over the detection algorithm</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-check-circle mt-1 mr-2 text-green-400"></i>
              <span>Can be continuously improved with new data</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }
}

// Export the component
window.PhishingModelTrainer = PhishingModelTrainer;
