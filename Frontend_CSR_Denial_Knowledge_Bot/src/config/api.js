// API Configuration
export const BASE_URL = 'http://localhost:8081';

export const API_ENDPOINTS = {
  // Authentication endpoints
  LOGIN: `${BASE_URL}/api/auth/login`,
  REGISTER: `${BASE_URL}/api/auth/register`,
  SIGNUP: `${BASE_URL}/api/auth/register`, // Alias for signup
  LOGOUT: `${BASE_URL}/api/auth/logout`,
  
  // Smart Query endpoints (main functionality)
  SMART_QUERY: `${BASE_URL}/api/smart/query`,
  SMART_RECOMMENDATIONS: `${BASE_URL}/api/smart/recommendations`,
  SMART_HISTORY: `${BASE_URL}/api/smart/history`,
  SMART_HISTORY_DATE_RANGE: `${BASE_URL}/api/smart/history/date-range`,
  SMART_HISTORY_TODAY: `${BASE_URL}/api/smart/history/today`,
  SMART_HEALTH: `${BASE_URL}/api/smart/health`,
  TRAIN_STATUS: `${BASE_URL}/api/smart/train-status`,
  AVAILABLE_DATA: `${BASE_URL}/api/smart/available-data`
}; 