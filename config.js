
// Environment configuration for Chrome Extension
const Environment = {
    LOCAL: 'local',
    NGROK: 'ngrok', 
    PRODUCTION: 'production'
  };
  
  // Set this to switch between environments
  const CURRENT_ENV = Environment.Local; // Change this as needed
  
  const API_URLS = {
    [Environment.LOCAL]: 'http://localhost:8000',
    [Environment.NGROK]: 'http://localhost:8000', // Replace with your ngrok URL
    [Environment.PRODUCTION]: 'http://localhost:8000' // Replace with your production URL
  };
  
  // Helper function to get API base URL
  const getApiBaseUrl = () => {
    return API_URLS[CURRENT_ENV];
  };
  
  // Export the base URL
  const API_BASE_URL = getApiBaseUrl();
  
  // Helper function to get request headers
  const getRequestHeaders = () => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
  
    // Add headers based on the current environment
    if (CURRENT_ENV === Environment.NGROK) {
      headers['ngrok-skip-browser-warning'] = 'true';
    }
  
    if (CURRENT_ENV === Environment.LOCAL) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
  
    return headers;
  };
  
  // Get current environment
  const getCurrentEnv = () => {
    return CURRENT_ENV;
  };
  
  // Export the current environment
  const CURRENT_ENVIRONMENT = CURRENT_ENV;
  
  // Allowed origins for CORS
  const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    getApiBaseUrl()
  ].filter(Boolean);
  
  // Export for use in other files
  window.ExtensionConfig = {
    Environment,
    CURRENT_ENV,
    API_URLS,
    getApiBaseUrl,
    API_BASE_URL,
    getRequestHeaders,
    getCurrentEnv,
    CURRENT_ENVIRONMENT,
    ALLOWED_ORIGINS
  };
  