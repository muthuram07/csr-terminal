/**
 * Centralized API Service with authentication handling and request interceptors
 * Manages all communication with the backend API
 */

import { BASE_URL } from '../config/api';

class APIService {
  constructor() {
    this.baseURL = BASE_URL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    this.tokenRefreshPromise = null;
  }

  /**
   * Get the current auth token from localStorage
   */
  getAuthToken() {
    if (typeof window === 'undefined') return null;

    const sessionToken = window.sessionStorage.getItem('authToken');
    if (sessionToken) return sessionToken;

    // Migrate legacy persistent auth to session storage.
    const legacyToken = window.localStorage.getItem('authToken');
    const legacyUser = window.localStorage.getItem('user');
    const legacyMethod = window.localStorage.getItem('authMethod');
    if (legacyToken) {
      window.sessionStorage.setItem('authToken', legacyToken);
      if (legacyUser) window.sessionStorage.setItem('user', legacyUser);
      if (legacyMethod) window.sessionStorage.setItem('authMethod', legacyMethod);
      window.localStorage.removeItem('authToken');
      window.localStorage.removeItem('user');
      window.localStorage.removeItem('authMethod');
      return legacyToken;
    }

    return null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.getAuthToken();
  }

  /**
   * Build headers with authentication
   */
  buildHeaders(customHeaders = {}) {
    const headers = { ...this.defaultHeaders };
    const token = this.getAuthToken();
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // DEV MODE: Inject a dev token for testing (bypasses Firebase auth requirement)
      // For production, ensure users are authenticated via Firebase
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev) {
        headers['Authorization'] = `Bearer dev-test-${Date.now()}`;
      }
    }

    // Add CORS headers
    headers['Access-Control-Allow-Credentials'] = 'true';
    
    return {
      ...headers,
      ...customHeaders,
    };
  }

  /**
   * Make an authenticated API request
   * @param {string} endpoint - The API endpoint
   * @param {Object} options - Fetch options
   * @param {string} options.method - HTTP method (GET, POST, etc.)
   * @param {Object} options.body - Request body
   * @param {Object} options.headers - Custom headers
   * @returns {Promise<Response>}
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const method = options.method || 'GET';
    const headers = this.buildHeaders(options.headers);

    const config = {
      method,
      headers,
      credentials: 'include', // Important for CORS
      ...options,
    };

    // Remove null/undefined body for GET requests
    if (method === 'GET' && !config.body) {
      delete config.body;
    }

    // Convert body to JSON if it's an object
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      console.log(`📤 ${method} ${url}`, {
        headers: headers,
        body: config.body ? JSON.parse(config.body) : null,
      });

      const response = await fetch(url, config);

      // Log response
      console.log(`📥 ${method} ${url} - Status: ${response.status}`);

      // Handle 401 - Token might be invalid
      if (response.status === 401) {
        console.warn('⚠️ Unauthorized (401) - Token may be invalid or expired');
        
        // Clear auth data
        this.clearAuth();
        
        // Redirect to login if needed
        if (typeof window !== 'undefined') {
          // Dispatch custom event for components to handle logout
          window.dispatchEvent(new CustomEvent('unauthorized'));
        }
      }

      return response;
    } catch (error) {
      console.error(`❌ ${method} ${url} - Network Error:`, error);
      throw error;
    }
  }

  /**
   * Convenience methods for common HTTP verbs
   */
  
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  async post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body,
    });
  }

  async put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body,
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Handle smart API endpoints with proper error handling
   */
  async smartQuery(query, medicalContext = {}, model = 'nvidia') {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Not authenticated. Please log in first.');
    }

    const response = await this.post('/api/smart/query', {
      query,
      model,
      timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
      medicalContext,
    });

    if (!response.ok) {
      const error = await this.handleErrorResponse(response);
      throw new Error(error.message);
    }

    return response.json();
  }

  async getSmartRecommendations(input, medicalContext = {}) {
    const token = this.getAuthToken();
    if (!token) {
      return { success: false, suggestions: [] };
    }

    const response = await this.post('/api/smart/recommendations', {
      input,
      limit: 5,
      medicalContext,
    });

    if (!response.ok) {
      console.error('Failed to get recommendations:', response.status);
      return { success: false, suggestions: [] };
    }

    return response.json();
  }

  /**
   * Authentication endpoints
   */
  
  async login(username, password) {
    const response = await this.post('/api/auth/login', {
      username,
      password,
    });

    if (!response.ok) {
      const error = await this.handleErrorResponse(response);
      return { success: false, message: error.message };
    }

    const data = await response.json();
    
    if (data.token) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('authToken', data.token);
      }
    }
    
    return data;
  }

  async register(username, email, password) {
    const response = await this.post('/api/auth/register', {
      username,
      email,
      password,
    });

    if (!response.ok) {
      const error = await this.handleErrorResponse(response);
      return { success: false, message: error.message };
    }

    return response.json();
  }

  async logout() {
    const response = await this.post('/api/auth/logout', {});
    this.clearAuth();
    return response;
  }

  /**
   * Health check to verify backend connectivity
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/api/smart/health`, {
        method: 'GET',
        headers: this.defaultHeaders,
      });
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Clear authentication data
   */
  clearAuth() {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem('authToken');
    window.sessionStorage.removeItem('user');
    window.sessionStorage.removeItem('authMethod');
    window.localStorage.removeItem('authToken');
    window.localStorage.removeItem('user');
    window.localStorage.removeItem('authMethod');
  }

  /**
   * Handle error responses
   */
  async handleErrorResponse(response) {
    try {
      const data = await response.json();
      return {
        message: data.message || data.error || 'An error occurred',
        status: response.status,
        data,
      };
    } catch (e) {
      return {
        message: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
      };
    }
  }
}

// Export singleton instance
export const apiService = new APIService();
export default apiService;
