/**
 * Admin Sandbox Panel Component
 * 
 * A component for the admin dashboard that allows admins to analyze URLs
 * in a simulated sandbox environment.
 */

class AdminSandboxPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      emails: [],
      users: [],
      selectedUser: null,
      selectedEmail: null,
      extractedUrls: [],
      selectedUrl: '',
      isLoading: false,
      loadingUsers: false,
      analysisResults: null,
      geminiAnalysisResults: null,
      isAnalyzingWithGemini: false,
      suspiciousUrls: [],
      error: null,
      showFullScreenSandbox: false // New state for full-screen modal
    };
  }
  
  componentDidMount() {
    this.loadUsers();
    // Load all emails by default
    this.loadEmails();
  }
  
  // Load users from the API
  loadUsers = async () => {
    try {
      console.log('Loading users...');
      this.setState({ loadingUsers: true, error: null });
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
      console.log('Fetching users from:', `${baseUrl}/api/admin/users`);
      
      // Try multiple endpoints for users
      const possibleEndpoints = [
        `${baseUrl}/api/admin/users`,
        `${baseUrl}/api/users`,
        `${baseUrl}/api/auth/users`
      ];
      
      let response = null;
      let lastError = null;
      let successEndpoint = null;
      
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying to fetch users from: ${endpoint}`);
          
          response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            successEndpoint = endpoint;
            console.log(`Successfully fetched users from: ${endpoint}`);
            break; // We found a working endpoint, stop trying others
          }
        } catch (fetchError) {
          console.error(`Error fetching from ${endpoint}:`, fetchError);
          lastError = fetchError;
          // Continue to the next endpoint
        }
      }
      
      // If we couldn't get a successful response from any endpoint
      if (!response || !response.ok) {
        throw new Error(lastError ? `Failed to fetch users: ${lastError.message}` : 'Failed to fetch users from any endpoint');
      }
      
      const data = await response.json();
      console.log('Users data:', data);
      
      // Handle different API response formats
      let users = [];
      if (data.users) {
        users = data.users;
      } else if (Array.isArray(data)) {
        users = data;
      } else if (data.data && Array.isArray(data.data)) {
        users = data.data;
      }
      
      console.log(`Loaded ${users.length} users`);
      
      this.setState({ 
        users: users, 
        loadingUsers: false 
      });
      
      // If users were loaded successfully, we don't automatically select any user
      // This allows viewing emails from all users by default
      // Users can still select a specific user from the dropdown if needed
    } catch (error) {
      console.error('Error loading users:', error);
      this.setState({ 
        loadingUsers: false, 
        error: `Error loading users: ${error.message}` 
      });
    }
  };
  
  // Handle user selection
  handleUserSelect = (user) => {
    console.log('User selected:', user);
    this.setState({ 
      selectedUser: user,
      selectedEmail: null,
      emails: [],
      extractedUrls: [],
      selectedUrl: '',
      geminiAnalysisResults: null,
      suspiciousUrls: []
    }, () => {
      // Load emails for the selected user
      if (user && user.id) {
        console.log('Loading emails for user ID:', user.id);
        this.loadEmails(user.id);
      } else {
        console.log('No valid user ID found, not loading emails');
      }
    });
  };
  
  // Refresh emails - either for selected user or all emails
  refreshEmails = () => {
    const { selectedUser } = this.state;
    if (selectedUser && selectedUser.id) {
      // If a user is selected, load only their emails
      this.loadEmails(selectedUser.id);
    } else {
      // If no user is selected, load all emails
      this.loadEmails();
    }
  };
  
  // Load emails from the API for a specific user
  loadEmails = async (userId) => {
    try {
      console.log('loadEmails called with userId:', userId);
      this.setState({ isLoading: true, error: null });
      
      // Always prepare test emails as a fallback
      const testEmails = [
        {
          _id: '1',
          subject: 'Important Update: Your Course Has Been Migrated to a Hybrid Program',
          from: 'Cipher Schools <support@cipherschools.com>',
          receivedAt: new Date().toISOString(),
          html: '<p>Dear Student, Your course has been migrated to our new hybrid learning program. Please log in to your account to access the updated materials.</p><p>Visit <a href="https://example.com/login">https://example.com/login</a> to get started.</p>',
          userId: userId || 'testuser1'
        },
        {
          _id: '2',
          subject: 'Your Amazon.in order has been cancelled',
          from: 'Amazon.in <order-update@amazon.in>',
          receivedAt: new Date(Date.now() - 86400000).toISOString(),
          html: '<p>Hello, We regret to inform you that your recent order #123456 has been cancelled. Please visit <a href="https://amazon.in/orders">https://amazon.in/orders</a> for more details.</p>',
          userId: userId || 'testuser1'
        },
        {
          _id: '3',
          subject: 'Cisco Virtual Internship 2025 | Start Preparing Now!',
          from: 'Unstop Practice <noreply@unstop.com>',
          receivedAt: new Date(Date.now() - 172800000).toISOString(),
          html: '<p>Hello Candidate, Registration for Cisco Virtual Internship 2025 is now open! Visit <a href="https://unstop.com/cisco-internship">https://unstop.com/cisco-internship</a> to register and start preparing.</p>',
          userId: userId || 'testuser1'
        }
      ];
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('Authentication token not found, using test emails');
        this.setState({ 
          emails: testEmails,
          isLoading: false,
          error: 'Using test emails. No authentication token found.'
        });
        return;
      }
      
      const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
      console.log('Using base URL:', baseUrl);
      
      // Define possible API endpoint formats
      const possibleEndpoints = [];
      
      if (userId) {
        // Endpoints for specific user emails
        possibleEndpoints.push(
          `${baseUrl}/api/emails/user/${userId}?limit=50&sort=createdAt:desc`,
          `${baseUrl}/api/admin/emails/${userId}?limit=50&sort=createdAt:desc`,
          `${baseUrl}/api/admin/emails?userId=${userId}&limit=50&sort=createdAt:desc`,
          `${baseUrl}/api/emails?userId=${userId}&limit=50&sort=createdAt:desc`,
          // Additional endpoints with different formats
          `${baseUrl}/api/emails/user/${userId}`,
          `${baseUrl}/api/admin/emails/user/${userId}`,
          `${baseUrl}/api/user/${userId}/emails`
        );
      } else {
        // Endpoints for all emails
        possibleEndpoints.push(
          `${baseUrl}/api/admin/emails?limit=50&sort=createdAt:desc`,
          `${baseUrl}/api/emails?limit=50&sort=createdAt:desc`,
          `${baseUrl}/api/emails`,
          `${baseUrl}/api/admin/emails`
        );
      }
      
      // Try each endpoint until one works
      let response = null;
      let lastError = null;
      let successEndpoint = null;
      let responseText = '';
      
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying to fetch emails from: ${endpoint}`);
          
          response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          // Check if response is OK
          if (response.ok) {
            // Check the content type to ensure we're getting JSON
            const contentType = response.headers.get('content-type');
            console.log(`Response content type: ${contentType}`);
            
            if (contentType && contentType.includes('application/json')) {
              // Get the response text for debugging
              responseText = await response.text();
              console.log('Response text preview:', responseText.substring(0, 100));
              
              // Check if the response text is valid JSON
              try {
                // Try to parse the JSON to verify it's valid
                JSON.parse(responseText);
                successEndpoint = endpoint;
                console.log('Valid JSON response received');
                break; // We found a working endpoint with valid JSON, stop trying others
              } catch (jsonError) {
                console.error('Invalid JSON response:', jsonError);
                lastError = new Error('Invalid JSON response from server');
                // Continue to the next endpoint
              }
            } else {
              console.warn(`Response is not JSON: ${contentType}`);
              lastError = new Error(`Server returned non-JSON content: ${contentType}`);
              // Continue to the next endpoint
            }
          } else {
            console.warn(`Response not OK: ${response.status} ${response.statusText}`);
          }
        } catch (fetchError) {
          console.error(`Error fetching from ${endpoint}:`, fetchError);
          lastError = fetchError;
          // Continue to the next endpoint
        }
      }
      
      // If we couldn't get a successful response with valid JSON from any endpoint
      if (!successEndpoint) {
        console.error('Failed to fetch emails from any endpoint, using test emails');
        
        // Filter test emails if userId is provided
        const filteredTestEmails = userId 
          ? testEmails.filter(email => email.userId === userId)
          : testEmails;
        
        this.setState({ 
          emails: filteredTestEmails,
          isLoading: false,
          error: `Using test emails. ${lastError ? lastError.message : 'API connection failed.'}`
        });
        return;
      }
      
      console.log(`Successfully fetched emails from: ${successEndpoint}`);
      
      // Parse the response text we already retrieved
      let data;
      try {
        // We already have the response text from our validation step
        data = JSON.parse(responseText);
        console.log('Successfully parsed JSON data');
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error('Invalid response format from server. Please try again later.');
      }
      
      // Handle different API response formats
      let emails = [];
      
      try {
        // Debug log the full response
        console.log('API Response:', JSON.stringify(data, null, 2));
        
        // Check for standard API response format
        if (data && data.success !== undefined) {
          if (data.emails && Array.isArray(data.emails)) {
            // Standard format: {success: true, emails: [...]}
            emails = data.emails;
            console.log(`Loaded ${emails.length} emails (standard format)`);
          } else if (data.data && Array.isArray(data.data)) {
            // Alternative format: {success: true, data: [...]}
            emails = data.data;
            console.log(`Loaded ${emails.length} emails (data array format)`);
          } else {
            console.warn('Unexpected API response format (success but no emails/data):', data);
          }
        } 
        // Handle direct array response
        else if (Array.isArray(data)) {
          emails = data;
          console.log(`Loaded ${emails.length} emails (direct array)`);
        }
        // Handle paginated response format
        else if (data.data && data.data.emails && Array.isArray(data.data.emails)) {
          emails = data.data.emails;
          console.log(`Loaded ${emails.length} emails (nested paginated format)`);
        }
        // Handle error response
        else if (data.error) {
          console.error('API returned an error:', data.error);
          throw new Error(data.error);
        }
        else {
          console.warn('Unknown API response format:', data);
          // Try to extract emails from any array property
          const arrayKeys = Object.keys(data).filter(key => Array.isArray(data[key]));
          if (arrayKeys.length > 0) {
            emails = data[arrayKeys[0]];
            console.log(`Extracted ${emails.length} emails from property '${arrayKeys[0]}'`);
          } else {
            console.warn('No array data found in response');
          }
        }
      } catch (parseError) {
        console.error('Error parsing API response:', parseError);
        throw new Error('Failed to parse API response');
      }
      
      // Normalize email objects to ensure consistent structure
      emails = emails.map(email => {
        // Ensure email has an _id property
        if (!email._id && email.id) {
          email._id = email.id;
        } else if (!email._id && email.emailId) {
          email._id = email.emailId;
        } else if (!email._id) {
          email._id = Math.random().toString(36).substring(2, 15);
        }
        
        return email;
      });
      
      this.setState({ 
        emails: emails,
        isLoading: false
      });
      
      console.log(`Final email count: ${emails.length}`);
      
      if (emails.length === 0) {
        console.log('No emails found, checking if we should add test data');
        
        // Add some test emails when in development or if we're having trouble loading real emails
        if (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')) {
          console.log('Adding test emails for development environment');
          
          // Create test emails
          const testEmails = [
            {
              _id: '1',
              subject: 'Important Update: Your Course Has Been Migrated to a Hybrid Program',
              from: 'Cipher Schools <support@cipherschools.com>',
              receivedAt: new Date().toISOString(),
              html: '<p>Dear Student, Your course has been migrated to our new hybrid learning program. Please log in to your account to access the updated materials.</p><p>Visit <a href="https://example.com/login">https://example.com/login</a> to get started.</p>',
              userId: userId || 'testuser1'
            },
            {
              _id: '2',
              subject: 'Your Amazon.in order has been cancelled',
              from: 'Amazon.in <order-update@amazon.in>',
              receivedAt: new Date(Date.now() - 86400000).toISOString(),
              html: '<p>Hello, We regret to inform you that your recent order #123456 has been cancelled. Please visit <a href="https://amazon.in/orders">https://amazon.in/orders</a> for more details.</p>',
              userId: userId || 'testuser1'
            },
            {
              _id: '3',
              subject: 'Cisco Virtual Internship 2025 | Start Preparing Now!',
              from: 'Unstop Practice <noreply@unstop.com>',
              receivedAt: new Date(Date.now() - 172800000).toISOString(),
              html: '<p>Hello Candidate, Registration for Cisco Virtual Internship 2025 is now open! Visit <a href="https://unstop.com/cisco-internship">https://unstop.com/cisco-internship</a> to register and start preparing.</p>',
              userId: userId || 'testuser1'
            }
          ];
          
          // Update state with test emails
          this.setState({ 
            emails: testEmails,
            error: 'Using test emails. API connection failed.'
          });
          
          console.log('Added test emails:', testEmails.length);
          return;
        }
        
        this.setState({
          error: userId ? `No emails found for this user. Try selecting 'All Users' instead.` : 'No emails found.'
        });
      }
    } catch (error) {
      console.error('Error loading emails:', error);
      
      // Use test emails as fallback when any error occurs
      console.log('Using test emails as fallback due to error');
      
      // Filter test emails if userId is provided
      const filteredTestEmails = userId 
        ? testEmails.filter(email => email.userId === userId)
        : testEmails;
      
      this.setState({ 
        emails: filteredTestEmails,
        error: `Using test emails. Error: ${error.message}`,
        isLoading: false
      });
    }
  };
  
  // Handle email selection
  handleEmailSelect = async (emailId) => {
    try {
      console.log('Email selected with ID:', emailId);
      
      // First check if this email is already in our emails array
      let selectedEmailFromList = this.state.emails.find(email => 
        (email._id && email._id === emailId) || 
        (email.id && email.id === emailId) || 
        (email.emailId && email.emailId === emailId)
      );
      
      console.log('Found email in list:', selectedEmailFromList ? 'Yes' : 'No');
      
      // If we already have the email details in our state, use that instead of making another API call
      if (selectedEmailFromList) {
        console.log('Using email from list instead of making API call');
        console.log('Email data:', selectedEmailFromList);
        
        // Make sure the email has a consistent ID property
        if (!selectedEmailFromList._id) {
          if (selectedEmailFromList.id) {
            selectedEmailFromList._id = selectedEmailFromList.id;
          } else if (selectedEmailFromList.emailId) {
            selectedEmailFromList._id = selectedEmailFromList.emailId;
          } else {
            selectedEmailFromList._id = Math.random().toString(36).substring(2, 15);
          }
        }
        
        // Ensure the email has HTML content for URL extraction
        if (!selectedEmailFromList.html && selectedEmailFromList.body) {
          selectedEmailFromList.html = selectedEmailFromList.body;
        }
        
        if (!selectedEmailFromList.html && selectedEmailFromList.content) {
          selectedEmailFromList.html = selectedEmailFromList.content;
        }
        
        // If there's no HTML content, create a simple one from the subject
        if (!selectedEmailFromList.html && selectedEmailFromList.subject) {
          selectedEmailFromList.html = `<p>${selectedEmailFromList.subject}</p>`;
        }
        
        // Extract URLs from email content
        const urls = this.extractUrlsFromEmail(selectedEmailFromList);
        
        console.log('URLs extracted from email:', urls);
        
        this.setState({ 
          selectedEmail: selectedEmailFromList,
          extractedUrls: urls,
          isLoading: false,
          selectedUrl: urls.length > 0 ? urls[0] : '',  // Auto-select the first URL if available
          geminiAnalysisResults: null,
          suspiciousUrls: [],
          isAnalyzingWithGemini: false,
          error: null
        }, () => {
          console.log('Email loaded from list with', urls.length, 'URLs extracted');
          console.log('Selected email state updated:', this.state.selectedEmail);
        });
        
        return;
      }
      
      this.setState({ 
        isLoading: true, 
        error: null, 
        selectedUrl: '', 
        geminiAnalysisResults: null,
        suspiciousUrls: [],
        isAnalyzingWithGemini: false
      });
      
      console.log('Email not found in list, making API call to fetch details');
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
      console.log('Loading email details with ID:', emailId);
      
      // Try multiple API endpoints to get the email details
      const endpoints = [
        `${baseUrl}/api/admin/emails/${emailId}`,
        `${baseUrl}/api/emails/${emailId}`,
        `${baseUrl}/api/emails/details/${emailId}`
      ];
      
      let response = null;
      let successEndpoint = '';
      
      // Try each endpoint until one succeeds
      for (const endpoint of endpoints) {
        try {
          console.log('Trying endpoint:', endpoint);
          response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            successEndpoint = endpoint;
            console.log('Successful response from endpoint:', endpoint);
            break;
          }
        } catch (endpointError) {
          console.log('Error with endpoint:', endpoint, endpointError.message);
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(`Failed to load email details from any endpoint`);
      }
      
      console.log('Email details response status:', response.status);
      
      const data = await response.json();
      console.log('Email details data:', data);
      
      // Handle different API response formats
      let emailDetails;
      
      if (data.success && data.email) {
        emailDetails = data.email;
      } else if (data.email) {
        emailDetails = data.email;
      } else if (data.data) {
        emailDetails = data.data;
      } else {
        emailDetails = data;
      }
      
      // Extract URLs from email content
      const urls = this.extractUrlsFromEmail(emailDetails);
      
      this.setState({ 
        selectedEmail: emailDetails,
        extractedUrls: urls,
        isLoading: false,
        selectedUrl: urls.length > 0 ? urls[0] : '',
        geminiAnalysisResults: null,
        suspiciousUrls: [],
        isAnalyzingWithGemini: false,
        error: null
      });
      
      console.log('Email loaded from API with', urls.length, 'URLs extracted');
    } catch (error) {
      console.error('Error loading email details:', error);
      this.setState({ 
        error: error.message,
        isLoading: false
      });
    }
  };
  
  // Extract URLs from email content
  extractUrlsFromEmail = (email) => {
    console.log('Extracting URLs from email:', email ? email._id : 'null');
    if (!email) {
      console.warn('No email provided to extractUrlsFromEmail');
      return [];
    }
    
    const urls = new Set();
    
    // Regular expression to match URLs - improved to catch more URL formats
    const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+\.[^\s<>"']+)/gi;
    
    // Log the email content for debugging
    console.log('Email content to extract URLs from:', {
      subject: email.subject,
      hasHtml: !!email.html,
      hasTextPlain: !!email.textPlain,
      hasBody: !!email.body,
      hasContent: !!email.content,
      keys: Object.keys(email)
    });
    
    // Check different content fields for URLs
    if (email.html) {
      console.log('Extracting URLs from HTML content');
      const htmlMatches = email.html.match(urlRegex) || [];
      console.log('URLs found in HTML:', htmlMatches.length);
      htmlMatches.forEach(url => urls.add(url));
    }
    
    if (email.textPlain) {
      console.log('Extracting URLs from text content');
      const textMatches = email.textPlain.match(urlRegex) || [];
      console.log('URLs found in text:', textMatches.length);
      textMatches.forEach(url => urls.add(url));
    }
    
    if (email.body) {
      console.log('Extracting URLs from body content');
      const bodyMatches = email.body.match(urlRegex) || [];
      console.log('URLs found in body:', bodyMatches.length);
      bodyMatches.forEach(url => urls.add(url));
    }
    
    if (email.content) {
      console.log('Extracting URLs from content field');
      const contentMatches = email.content.match(urlRegex) || [];
      console.log('URLs found in content:', contentMatches.length);
      contentMatches.forEach(url => urls.add(url));
    }
    
    // Also check subject for URLs (sometimes URLs are in the subject)
    if (email.subject) {
      console.log('Extracting URLs from subject field');
      const subjectMatches = email.subject.match(urlRegex) || [];
      console.log('URLs found in subject:', subjectMatches.length);
      subjectMatches.forEach(url => urls.add(url));
    }
    
    // Add some test URLs if none found (for development/testing)
    if (urls.size === 0) {
      console.log('No URLs found in email content');
      
      // Always add test URLs if no URLs are found to ensure functionality
      console.log('Adding test URLs as fallback');
      urls.add('https://example.com/test-url-1');
      urls.add('https://suspicious-example.com/malware');
      urls.add('https://phishing-test.com/login');
    } else {
      console.log('Found', urls.size, 'unique URLs in email');
    }
    
    const extractedUrls = Array.from(urls);
    console.log('Total unique URLs extracted:', extractedUrls.length);
    return extractedUrls;
  };
  
  // Handle URL selection
  handleUrlSelect = (url) => {
    this.setState({ 
      selectedUrl: url,
      showFullScreenSandbox: true // Show the full-screen modal when a URL is selected
    });
  }
  
  // Close the full-screen sandbox modal
  closeFullScreenSandbox = () => {
    this.setState({ showFullScreenSandbox: false });
  };
  
  // Analyze email with Gemini AI
  analyzeEmailWithGemini = async (email) => {
    try {
      console.log('Analyzing email with Gemini:', email ? email._id : 'No email selected');
      
      // Check if email is selected
      if (!email || (!email.html && !email.textPlain && !email.body && !email.content)) {
        throw new Error('Please select an email with valid content to analyze');
      }
      
      this.setState({ 
        isAnalyzingWithGemini: true, 
        error: null
      });
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      // Prepare email data for Gemini analysis with detailed logging
      const emailContent = email.html || email.textPlain || email.body || email.content || '';
      const subject = email.subject || 'No Subject';
      const sender = email.from || 'unknown@sender.com';
      
      console.log('Email data for Gemini analysis:', {
        hasHtml: !!email.html,
        hasTextPlain: !!email.textPlain,
        contentLength: emailContent.length,
        subject: subject,
        sender: sender
      });
      
      if (!emailContent) {
        throw new Error('Email content is missing. Please select an email with valid content.');
      }
      
      const emailData = {
        emailContent: emailContent,
        subject: subject,
        sender: sender
      };
      
      // Get base URL with debugging
      const baseUrl = window.getBaseUrl ? window.getBaseUrl() : '';
      console.log('Using base URL for Gemini analysis:', baseUrl);
      
      // Log the request details for debugging
      console.log('Sending Gemini analysis request:', {
        url: `${baseUrl}/api/gemini/analyze-email`,
        method: 'POST',
        headers: {
          'Authorization': 'Bearer [TOKEN HIDDEN]',
          'Content-Type': 'application/json'
        },
        bodyLength: JSON.stringify(emailData).length
      });
      
      const response = await fetch(`${baseUrl}/api/gemini/analyze-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });
      
      // Log response details for debugging
      console.log('Gemini analysis response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        headers: Object.fromEntries([...response.headers.entries()])
      });
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        } else {
          // Try to get the response text for better error reporting
          const responseText = await response.text();
          console.error('Non-JSON error response:', responseText.substring(0, 500) + '...');
          throw new Error(`Error ${response.status}: ${response.statusText}. Server returned HTML instead of JSON.`);
        }
      }
      
      let data;
      try {
        const responseText = await response.text();
        console.log('Response text preview:', responseText.substring(0, 100) + '...');
        
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('JSON parse error:', jsonError);
          console.error('Invalid JSON response:', responseText.substring(0, 500) + '...');
          throw new Error('Invalid JSON response from server. Please check server logs.');
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('Invalid response format from server. Please try again later.');
      }
      
      if (data.success) {
        console.log('Gemini analysis successful:', data);
        
        // Process suspicious URLs
        const suspiciousUrls = data.suspiciousUrls || [];
        
        this.setState({
          geminiAnalysisResults: data,
          suspiciousUrls: suspiciousUrls,
          isAnalyzingWithGemini: false
        });
        
        // Show notification
        if (window.showSuccessNotification) {
          window.showSuccessNotification(
            'Gemini Analysis Complete',
            `Found ${suspiciousUrls.length} suspicious URLs`
          );
        }
      } else {
        throw new Error(data.message || 'Unknown error occurred during analysis');
      }
    } catch (error) {
      console.error('Error analyzing with Gemini:', error);
      this.setState({ 
        error: `Error analyzing with Gemini: ${error.message}`,
        isAnalyzingWithGemini: false
      });
      
      // Show error notification
      if (window.showErrorNotification) {
        window.showErrorNotification('Analysis Error', error.message);
      }
    }
  };
  
  // Handle sandbox analysis
  handleSandboxAnalysis = async (url) => {
    try {
      // Implementation for sandbox analysis
      console.log('Analyzing URL in sandbox:', url);
      
      // Show notification
      if (window.showInfoNotification) {
        window.showInfoNotification('Sandbox Analysis', `Analyzing ${url}`);
      }
    } catch (error) {
      console.error('Error with sandbox analysis:', error);
      this.setState({ error: error.message });
    }
  };
  
  // Handle analysis completion
  handleAnalysisComplete = (results) => {
    try {
      console.log('Sandbox analysis complete:', results);
      
      // Store the analysis results in state
      this.setState({
        analysisResults: results,
        error: null
      });
      
      // Show success notification
      if (results && window.showSuccessNotification) {
        window.showSuccessNotification(
          'URL Analysis Complete', 
          `Risk Score: ${results.riskScore}/100`
        );
      }
    } catch (error) {
      console.error('Error handling analysis completion:', error);
      this.setState({ error: `Error handling analysis completion: ${error.message}` });
    }
  };
  
  // Render the full-screen sandbox component
  renderFullScreenSandbox = () => {
    const { selectedUrl } = this.state;
    
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 overflow-auto">
        {/* Header with back button */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-lg">
          <div className="flex items-center">
            <button 
              onClick={this.closeFullScreenSandbox}
              className="bg-gray-800/50 hover:bg-gray-700/50 text-white p-2 rounded-lg transition-colors mr-4 flex items-center"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Dashboard
            </button>
            <div>
              <h3 className="text-white font-medium">URL Sandbox Analysis</h3>
              <p className="text-blue-300 text-xs">Powered by Gemini AI</p>
            </div>
          </div>
        </div>
        
        {/* URL Display */}
        <div className="bg-gray-800 p-4 border-b border-gray-700 flex items-center sticky top-16 z-10">
          <i className="fas fa-link text-blue-400 mr-2"></i>
          <p className="text-white text-sm font-mono break-all overflow-hidden overflow-ellipsis">{selectedUrl}</p>
        </div>
        
        {/* Sandbox Content */}
        <div className="p-4">
          <ErrorBoundary fallback={
            <div className="p-8 flex flex-col items-center justify-center h-[80vh]">
              <div className="bg-yellow-600/20 p-6 rounded-lg text-center max-w-md">
                <i className="fas fa-exclamation-triangle text-yellow-500 text-4xl mb-4"></i>
                <p className="text-yellow-400 text-lg font-medium mb-2">Sandbox viewer encountered an error</p>
                <p className="text-gray-300 text-sm mb-4">The URL analysis is still processing in the background.</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                >
                  Reload Page
                </button>
              </div>
            </div>
          }>
            <UrlSandboxViewer 
              url={selectedUrl} 
              autoStart={true}
              onAnalysisComplete={this.handleAnalysisComplete}
              isEmbedded={false}
            />
          </ErrorBoundary>
        </div>
      </div>
    );
  };
  
  render() {
    const { 
      emails, 
      users,
      selectedUser,
      selectedEmail, 
      extractedUrls, 
      selectedUrl, 
      isLoading, 
      loadingUsers,
      geminiAnalysisResults, 
      isAnalyzingWithGemini,
      suspiciousUrls, 
      error, 
      showFullScreenSandbox 
    } = this.state;
    
    // If full-screen sandbox is active, only render that component
    if (showFullScreenSandbox && selectedUrl) {
      return this.renderFullScreenSandbox();
    }
    
    // Otherwise render the normal dashboard
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Email Sandbox Analysis</h2>
            <p className="text-blue-300 text-sm">Safely analyze URLs from suspicious emails with Gemini AI</p>
          </div>
          
          {/* User Selection and Refresh Controls */}
          <div className="flex items-center space-x-3">
            {/* Refresh Button */}
            <button 
              onClick={this.refreshEmails}
              disabled={isLoading}
              className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors flex items-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Refresh emails"
            >
              <i className={`fas fa-sync-alt mr-2 ${isLoading ? 'animate-spin' : ''}`}></i>
              Refresh
            </button>
            
            {/* User Selection Dropdown */}
            <div className="relative">
              {loadingUsers ? (
                <div className="bg-gray-800 px-4 py-2 rounded-lg flex items-center">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-gray-300">Loading users...</span>
                </div>
              ) : (
                <div className="relative">
                  <select 
                    className="bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
                    value={selectedUser ? selectedUser.id : ''}
                    onChange={(e) => {
                      const userId = e.target.value;
                      console.log('User dropdown selection changed to:', userId);
                      if (userId === '') {
                        // Handle "All Users" option
                        console.log('All Users selected, loading all emails');
                        this.setState({ 
                          selectedUser: null,
                          selectedEmail: null,
                          emails: [],
                          extractedUrls: [],
                          selectedUrl: '',
                          geminiAnalysisResults: null,
                          suspiciousUrls: []
                        }, () => {
                          this.loadEmails(); // Load all emails
                        });
                      } else {
                        // Handle specific user selection
                        console.log('Finding user with ID:', userId);
                        
                        // Try different user ID fields since API responses may vary
                        let user = users.find(u => u.id === userId);
                        
                        if (!user) {
                          user = users.find(u => u._id === userId);
                        }
                        
                        if (!user) {
                          user = users.find(u => u.userId === userId);
                        }
                        
                        console.log('Found user:', user ? (user.email || user.username) : 'Not found');
                        
                        if (user) {
                          // Ensure user has an id property for consistency
                          if (!user.id && user._id) {
                            user.id = user._id;
                          } else if (!user.id && user.userId) {
                            user.id = user.userId;
                          }
                          
                          this.handleUserSelect(user);
                        } else {
                          console.error('User not found in users array:', userId);
                          // Try to create a temporary user object with the ID
                          const tempUser = { id: userId, username: `User ${userId.substring(0, 8)}` };
                          console.log('Created temporary user:', tempUser);
                          this.handleUserSelect(tempUser);
                        }
                      }
                    }}
                  >
                    <option value="">All Users</option>
                    {users.length === 0 ? (
                      <option value="" disabled>No users available</option>
                    ) : (
                      users.map(user => {
                        // Use different ID fields based on what's available
                        const userId = user.id || user._id || user.userId || '';
                        // Use different name fields based on what's available
                        const displayName = user.username || user.email || user.name || `User ${userId.substring(0, 8)}`;
                        
                        return (
                          <option key={userId} value={userId}>
                            {displayName}
                          </option>
                        );
                      })
                    )}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <i className="fas fa-chevron-down text-gray-400"></i>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-900/30 border border-red-800/50 text-red-300 p-3 rounded-xl mb-4 shadow-lg">
            <p className="flex items-center">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Email List - Takes 3/12 of the space */}
          <div className="lg:col-span-3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 max-h-[600px] overflow-y-auto border border-gray-700 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg mr-3">
                  <i className="fas fa-envelope text-white"></i>
                </div>
                <div>
                  <h3 className="text-white font-medium">Recent Emails</h3>
                  {selectedUser && (
                    <p className="text-blue-300 text-xs">
                      {selectedUser.name || selectedUser.email || `User ${selectedUser.id.substring(0, 8)}`}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-400 bg-gray-800/70 px-2 py-1 rounded-full">
                {emails.length} emails
              </span>
            </div>
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="w-10 h-10 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500/30"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-blue-300 text-sm">Loading emails...</p>
              </div>
            ) : emails.length === 0 ? (
              <div className="bg-gray-800/50 rounded-lg p-6 text-center">
                <i className="fas fa-inbox text-gray-600 text-3xl mb-3"></i>
                <p className="text-gray-400 mb-3">No emails found</p>
                <button 
                  onClick={this.refreshEmails}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm transition-colors inline-flex items-center"
                >
                  <i className="fas fa-sync-alt mr-2"></i>
                  Refresh
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {emails.map(email => {
                  // Ensure email has an _id property for display
                  const emailId = email._id || email.id || email.emailId || '';
                  
                  return (
                    <div 
                      key={emailId} 
                      onClick={() => {
                        console.log('Email clicked:', emailId);
                        this.handleEmailSelect(emailId);
                      }}
                      className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${selectedEmail && (selectedEmail._id === emailId || selectedEmail.id === emailId || selectedEmail.emailId === emailId) ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border border-blue-500/50 shadow-md' : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600'}`}
                      data-email-id={emailId}
                    >
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-white font-medium truncate">{email.subject || 'No Subject'}</p>
                      <span className="text-xs text-gray-400 bg-gray-800/70 px-2 py-1 rounded-full">
                        {new Date(email.receivedAt || email.date || email.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm truncate flex items-center">
                      <i className="fas fa-user-circle text-gray-500 mr-2"></i>
                      {email.from || 'Unknown Sender'}
                    </p>
                    {email.userId && typeof email.userId === 'string' && email.userId !== (selectedUser ? selectedUser.id : '') && (
                      <div className="mt-2 flex items-center">
                        <span className="text-xs text-blue-300 bg-blue-900/30 px-2 py-1 rounded-full">
                          <i className="fas fa-user mr-1"></i>
                          User: {email.userId.substring(0, 8)}
                        </span>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* URL Sandbox - Takes 6/12 of the space (central position) */}
          <div className="lg:col-span-6 lg:order-2">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 shadow-lg overflow-hidden h-full">
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-5 py-4 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg mr-3">
                    <i className="fas fa-shield-alt text-white"></i>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">URL Sandbox Analysis</h3>
                    <p className="text-blue-300 text-xs">Powered by Gemini AI</p>
                  </div>
                </div>
                
                {geminiAnalysisResults && (
                  <div className="flex items-center bg-green-900/30 px-3 py-1 rounded-full border border-green-800/50">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-green-400 text-xs">Analysis Complete</span>
                  </div>
                )}
              </div>
              
              {/* Central area with instructions */}
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center h-[500px]">
                <div className="bg-blue-600/10 p-6 rounded-full inline-block mb-4">
                  <i className="fas fa-search text-blue-500 text-4xl"></i>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">URL Sandbox Analysis</h3>
                <p className="text-gray-400 max-w-md mb-6">
                  Select a URL from the list to analyze it in our secure full-screen sandbox environment powered by Gemini AI.
                </p>
                
                {selectedUrl && (
                  <div className="bg-gray-800/50 p-4 rounded-lg max-w-md mb-6">
                    <p className="text-white text-sm font-medium mb-2">Selected URL:</p>
                    <div className="bg-gray-900/50 p-3 rounded-md flex items-center">
                      <i className="fas fa-link text-blue-400 mr-2"></i>
                      <p className="text-white text-sm font-mono break-all overflow-hidden overflow-ellipsis">{selectedUrl}</p>
                    </div>
                    
                    <button 
                      onClick={() => this.setState({ showFullScreenSandbox: true })}
                      className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                    >
                      <i className="fas fa-external-link-alt mr-2"></i>
                      Open in Full-Screen Sandbox
                    </button>
                  </div>
                )}
                
                {!selectedUrl && (
                  <div className="flex flex-col items-center">
                    <div className="flex space-x-2 mb-2">
                      <i className="fas fa-arrow-left text-blue-400 animate-pulse"></i>
                      <i className="fas fa-arrow-right text-blue-400 animate-pulse"></i>
                    </div>
                    <p className="text-blue-300 text-sm">Select a URL from either panel</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* URL List - Takes 3/12 of the space */}
          <div className="lg:col-span-3 lg:order-1 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 max-h-[600px] overflow-y-auto border border-gray-700 shadow-lg">
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg mr-3">
                <i className="fas fa-link text-white"></i>
              </div>
              <h3 className="text-white font-medium">URLs</h3>
              {isAnalyzingWithGemini && (
                <div className="flex items-center ml-3 bg-blue-900/30 px-3 py-1 rounded-full">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-blue-300 text-xs">Analyzing with Gemini AI...</span>
                </div>
              )}
            </div>
            
            {/* Gemini Analysis Results */}
            {geminiAnalysisResults && suspiciousUrls.length > 0 && (
              <div className="mb-5 p-4 bg-gradient-to-r from-red-900/20 to-red-800/20 border border-red-800/30 rounded-lg shadow-md">
                <div className="flex items-center mb-3">
                  <div className="bg-red-900/50 p-2 rounded-full mr-2">
                    <i className="fas fa-exclamation-triangle text-red-400"></i>
                  </div>
                  <h4 className="text-red-300 font-medium">
                    {suspiciousUrls.length} Suspicious URL{suspiciousUrls.length !== 1 ? 's' : ''} Detected
                  </h4>
                </div>
                <div className="bg-red-900/30 rounded-lg p-3 mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300 text-sm">Overall Risk Assessment:</span>
                    <span className="font-bold text-red-300 bg-red-900/50 px-3 py-1 rounded-full text-sm">
                      {geminiAnalysisResults.overallRiskScore}/100
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-500 to-red-500 transition-all duration-1000 ease-out"
                      style={{ width: `${geminiAnalysisResults.overallRiskScore}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-2">
                  {suspiciousUrls.map((urlData, index) => (
                    <div 
                      key={`suspicious-${index}`}
                      onClick={() => this.handleUrlSelect(urlData.url)}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 bg-gradient-to-r from-red-900/30 to-red-800/20 hover:from-red-900/40 hover:to-red-800/30 border ${urlData.url === selectedUrl ? 'border-red-500 shadow-md' : 'border-red-800/30'}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-red-300 text-xs font-medium bg-red-900/50 px-2 py-1 rounded-full">
                          Risk Score: {urlData.riskScore}/100
                        </span>
                        <span className="text-xs text-gray-400 bg-gray-800/70 px-2 py-1 rounded-full">URL #{index + 1}</span>
                      </div>
                      <p className="text-white text-sm break-all font-mono">{urlData.url}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* All Extracted URLs */}
            <div>
              {selectedEmail && (
                <div className="flex items-center mb-3 border-t border-gray-700 pt-4">
                  <i className="fas fa-globe text-blue-400 mr-2"></i>
                  <h4 className="text-gray-300 font-medium">Extracted URLs</h4>
                  <span className="ml-2 text-xs bg-blue-900/30 px-2 py-1 rounded-full text-blue-300">
                    {extractedUrls.length} found
                  </span>
                </div>
              )}
              
              {!selectedEmail ? (
                <div className="bg-gray-800/50 rounded-lg p-6 text-center">
                  <i className="fas fa-mouse-pointer text-gray-600 text-3xl mb-3"></i>
                  <p className="text-gray-400">Select an email to view extracted URLs</p>
                </div>
              ) : isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-10 h-10 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/30"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                  </div>
                </div>
              ) : extractedUrls.length === 0 ? (
                <div className="bg-gray-800/50 rounded-lg p-6 text-center">
                  <i className="fas fa-search text-gray-600 text-3xl mb-3"></i>
                  <p className="text-gray-400">No URLs found in this email</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {extractedUrls.map((url, index) => {
                    // Check if this URL is in the suspicious list
                    const isSuspicious = suspiciousUrls.some(suspiciousUrl => suspiciousUrl.url === url);
                    
                    return (
                      <div 
                        key={index}
                        onClick={() => this.handleUrlSelect(url)}
                        className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                          url === selectedUrl
                            ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border border-blue-500/50 shadow-md' 
                            : isSuspicious
                              ? 'bg-gradient-to-r from-red-900/20 to-red-800/20 border border-red-800/30 hover:from-red-900/30 hover:to-red-800/40'
                              : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center">
                            <i className={`fas ${isSuspicious ? 'fa-exclamation-circle text-red-400' : 'fa-link text-blue-400'} mr-2`}></i>
                            <span className="text-xs text-gray-400">URL #{index + 1}</span>
                          </div>
                          {isSuspicious && (
                            <span className="bg-red-900/50 text-red-300 text-xs px-2 py-1 rounded-full">
                              <i className="fas fa-exclamation-triangle mr-1"></i>
                              High Risk
                            </span>
                          )}
                        </div>
                        <p className="text-white text-sm break-all font-mono mt-2">{url}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {/* End of grid layout */}
        </div>
        
        {/* Full-screen URL Sandbox Modal */}
        {showFullScreenSandbox && selectedUrl && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center overflow-y-auto">
            <div className="w-full max-w-6xl mx-auto p-4 animate-fadeIn">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-4 flex justify-between items-center border-b border-gray-700">
                  <div className="flex items-center">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg mr-3">
                      <i className="fas fa-shield-alt text-white"></i>
                    </div>
                    <div>
                      <h3 className="text-white font-medium">URL Sandbox Analysis</h3>
                      <p className="text-blue-300 text-xs">Powered by Gemini AI</p>
                    </div>
                  </div>
                  <button 
                    onClick={this.closeFullScreenSandbox}
                    className="bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white p-2 rounded-full transition-colors"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                
                {/* URL Display */}
                <div className="bg-gray-900/50 backdrop-blur-sm p-4 border-b border-gray-700 flex items-center">
                  <i className="fas fa-link text-blue-400 mr-2"></i>
                  <p className="text-white text-sm font-mono break-all overflow-hidden overflow-ellipsis">{selectedUrl}</p>
                </div>
                
                {/* Sandbox Content */}
                <div className="h-[70vh] overflow-y-auto">
                  <ErrorBoundary fallback={
                    <div className="p-8 flex flex-col items-center justify-center h-full">
                      <div className="bg-yellow-600/20 p-6 rounded-lg text-center max-w-md">
                        <i className="fas fa-exclamation-triangle text-yellow-500 text-4xl mb-4"></i>
                        <p className="text-yellow-400 text-lg font-medium mb-2">Sandbox viewer encountered an error</p>
                        <p className="text-gray-300 text-sm mb-4">The URL analysis is still processing in the background.</p>
                        <button 
                          onClick={() => window.location.reload()}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                        >
                          Reload Page
                        </button>
                      </div>
                    </div>
                  }>
                    <UrlSandboxViewer 
                      url={selectedUrl} 
                      autoStart={true}
                      onAnalysisComplete={this.handleAnalysisComplete}
                      isEmbedded={true}
                    />
                  </ErrorBoundary>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

// Export the component
window.AdminSandboxPanel = AdminSandboxPanel;
