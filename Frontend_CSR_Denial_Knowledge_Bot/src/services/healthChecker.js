/**
 * Health Check Utility
 * Verifies backend connectivity and provides diagnostic information
 */

import apiService from './apiService';

export class HealthChecker {
  static async checkBackendHealth() {
    try {
      const isHealthy = await apiService.healthCheck();
      return {
        status: isHealthy ? 'online' : 'offline',
        message: isHealthy ? 'Backend is running' : 'Backend is not responding',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Health check failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  static async checkAuthentication() {
    const token = apiService.getAuthToken();
    return {
      isAuthenticated: apiService.isAuthenticated(),
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'No token',
    };
  }

  static async runDiagnostics() {
    console.log('🔍 Running Backend Diagnostics...\n');

    // 1. Check backend health
    console.log('1️⃣ Checking Backend Health...');
    const healthStatus = await this.checkBackendHealth();
    console.log('   Status:', healthStatus.status);
    console.log('   Message:', healthStatus.message);

    // 2. Check authentication
    console.log('\n2️⃣ Checking Authentication...');
    const authStatus = await this.checkAuthentication();
    console.log('   Authenticated:', authStatus.isAuthenticated);
    console.log('   Has Token:', authStatus.hasToken);
    console.log('   Token Preview:', authStatus.tokenPreview);

    // 3. Check environment
    console.log('\n3️⃣ Environment Configuration...');
    console.log('   Backend URL:', apiService.baseURL);
    console.log('   Frontend URL:', window.location.origin);
    console.log('   Node Environment:', process.env.REACT_APP_NODE_ENV);

    // 4. Check CORS
    console.log('\n4️⃣ CORS Configuration...');
    console.log('   Frontend Origin:', window.location.origin);
    console.log('   Expected CORS Origin:', window.location.origin);

    console.log('\n✅ Diagnostics Complete!');

    return {
      health: healthStatus,
      auth: authStatus,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get diagnostic information as an object (for UI display)
   */
  static async getDiagnosticsObject() {
    const health = await this.checkBackendHealth();
    const auth = await this.checkAuthentication();

    return {
      backend: {
        url: apiService.baseURL,
        health: health.status,
        message: health.message,
      },
      authentication: {
        isAuthenticated: auth.isAuthenticated,
        hasToken: auth.hasToken,
      },
      environment: {
        frontend: window.location.origin,
        nodeEnv: process.env.REACT_APP_NODE_ENV,
        apiPort: process.env.REACT_APP_API_PORT || '8081',
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export default HealthChecker;
