import { createContext, useContext, useState, useEffect } from 'react';
import { API_ENDPOINTS, BASE_URL } from '../config/api';

// Create the context
const AuthContext = createContext(null);

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // User object, or null if not logged in
  const [loading, setLoading] = useState(true); // To check if initial auth state is loaded
  const [token, setToken] = useState(null); // JWT token

  // Check for existing authentication on app load
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const register = async (username, email, password) => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Registration successful
        setLoading(false);
        return { success: true, message: data.message, username: data.username };
      } else {
        // Registration failed
        setLoading(false);
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch (error) {
      setLoading(false);
      console.error('Registration error:', error);
      return { success: false, message: 'Network error. Please check if backend is running on port 8081.' };
    }
  };

  const login = async (username, password) => {
    setLoading(true);
    try {
      console.log('AuthContext: Sending login request for:', username); // Debug log
      
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      console.log('AuthContext: Response status:', response.status); // Debug log
      const data = await response.json();
      console.log('AuthContext: Response data:', data); // Debug log

      if (response.ok && data.success) {
        // Successful login
        const userInfo = {
          username: data.username,
          token: data.token
        };
        
        setUser(userInfo);
        setToken(data.token);
        
        // Store in localStorage
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(userInfo));
        
        setLoading(false);
        console.log('AuthContext: Login successful'); // Debug log
        return { success: true, message: data.message };
      } else {
        // Login failed
        setLoading(false);
        console.log('AuthContext: Login failed with message:', data.message); // Debug log
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      setLoading(false);
      console.error('AuthContext: Login error:', error);
      return { success: false, message: 'Network error. Please check if backend is running on port 8081.' };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        // Call backend logout API
        await fetch(API_ENDPOINTS.LOGOUT, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API call result
      setUser(null);
      setToken(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  };

  // Function to make authenticated API calls (for future use)
  const apiCall = async (endpoint, options = {}) => {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${BASE_URL}/api${endpoint}`, mergedOptions);
      return response;
    } catch (error) {
      console.error('API call error:', error);
      throw error;
    }
  };

  const authContextValue = {
    user,
    loading,
    register,
    login,
    logout,
    apiCall,
    isAuthenticated: !!user && !!token,
    token,
  };

  // Show loading spinner while checking auth state
  if (loading) {
    return <div>Loading authentication...</div>;
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};