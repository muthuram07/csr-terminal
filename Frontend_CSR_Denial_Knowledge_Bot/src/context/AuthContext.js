import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { BASE_URL } from '../config/api';
import apiService from '../services/apiService';

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
  const [authMethod, setAuthMethod] = useState('backend'); // 'backend' or 'firebase'
  const setAuthStorage = useCallback((nextToken, nextUser, nextMethod) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem('authToken', nextToken);
    window.sessionStorage.setItem('user', JSON.stringify(nextUser));
    window.sessionStorage.setItem('authMethod', nextMethod);
    // Remove legacy persistent auth to avoid auto-login across browser restarts.
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('authMethod');
  }, []);

  // Firebase Auth State Listener - prevents flickering
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in with Firebase
        const userInfo = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0]
        };

        // Get Firebase ID token
        const idToken = await firebaseUser.getIdToken();

        setUser(userInfo);
        setToken(idToken);
        setAuthMethod('firebase');

        // Store in localStorage
        setAuthStorage(idToken, userInfo, 'firebase');
      } else {
        // Check for backend auth
        const storedToken = typeof window !== 'undefined' ? window.sessionStorage.getItem('authToken') : null;
        const storedUser = typeof window !== 'undefined' ? window.sessionStorage.getItem('user') : null;
        const storedMethod = typeof window !== 'undefined' ? window.sessionStorage.getItem('authMethod') : null;

        if (storedToken && storedUser && storedMethod === 'backend') {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setAuthMethod('backend');
        } else {
          // No authentication
          setUser(null);
          setToken(null);
          setAuthMethod('backend');
        }
      }

      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [setAuthStorage]);

  // Firebase Google Sign-In
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      setLoading(false);
      return {
        success: true,
        message: 'Google sign-in successful',
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }
      };
    } catch (error) {
      setLoading(false);
      console.error('Google sign-in error:', error);

      let errorMessage = 'Google sign-in failed';
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Popup closed by user';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Popup blocked by browser';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Authentication cancelled';
          break;
        default:
          errorMessage = error.message || 'Google sign-in failed';
      }

      return { success: false, message: errorMessage };
    }
  };

  // Firebase Password Reset
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: 'Password reset email sent' };
    } catch (error) {
      console.error('Password reset error:', error);

      let errorMessage = 'Password reset failed';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Email not found';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email format';
          break;
        default:
          errorMessage = error.message || 'Password reset failed';
      }

      return { success: false, message: errorMessage };
    }
  };

  // Backend API Registration (maintains backward compatibility)
  const register = async (username, email, password) => {
    setLoading(true);
    try {
      const response = await apiService.post('/api/auth/register', {
        username,
        email,
        password
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLoading(false);
        return { success: true, message: data.message, username: data.username };
      } else {
        setLoading(false);
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch (error) {
      setLoading(false);
      console.error('Registration error:', error);
      return { success: false, message: 'Network error. Please check if backend is running on port 8081.' };
    }
  };

  // Firebase Email/Password Registration
  const registerWithFirebase = async (email, password, displayName) => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      // Optionally update display name
      if (displayName && result.user) {
        // You can use updateProfile here if needed
      }

      setLoading(false);
      return { success: true, message: 'Registration successful' };
    } catch (error) {
      setLoading(false);
      console.error('Firebase registration error:', error);

      let errorMessage = 'Registration failed';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Email already in use';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email format';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak';
          break;
        default:
          errorMessage = error.message || 'Registration failed';
      }

      return { success: false, message: errorMessage };
    }
  };

  // Backend API Login (maintains backward compatibility)
  const login = async (username, password) => {
    setLoading(true);
    try {
      console.log('AuthContext: Sending login request for:', username);

      const response = await apiService.post('/api/auth/login', {
        username,
        password
      });

      console.log('AuthContext: Response status:', response.status);
      const data = await response.json();
      console.log('AuthContext: Response data:', data);

      if (response.ok && data.success) {
        const userInfo = {
          username: data.username,
          token: data.token
        };

        setUser(userInfo);
        setToken(data.token);
        setAuthMethod('backend');

        setAuthStorage(data.token, userInfo, 'backend');

        setLoading(false);
        console.log('AuthContext: Login successful');
        return { success: true, message: data.message };
      } else {
        setLoading(false);
        console.log('AuthContext: Login failed with message:', data.message);
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      setLoading(false);
      console.error('AuthContext: Login error:', error);
      return { success: false, message: 'Network error. Please check if backend is running on port 8081.' };
    }
  };

  // Firebase Email/Password Login
  const loginWithFirebase = async (email, password) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLoading(false);
      return { success: true, message: 'Login successful' };
    } catch (error) {
      setLoading(false);
      console.error('Firebase login error:', error);

      let errorMessage = 'Login failed';
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Invalid email or password';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email format';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Account has been disabled';
          break;
        default:
          errorMessage = error.message || 'Login failed';
      }

      return { success: false, message: errorMessage };
    }
  };

  // Unified Logout
  const logout = async () => {
    try {
      if (authMethod === 'firebase') {
        // Firebase logout
        await signOut(auth);
      } else if (token) {
        // Backend API logout
        await apiService.post('/api/auth/logout', {});
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state
      setUser(null);
      setToken(null);
      setAuthMethod('backend');
      apiService.clearAuth();
    }
  };

  // Function to make authenticated API calls
  const apiCall = async (endpoint, options = {}) => {
    let currentToken = token;
    if (authMethod === 'firebase' && auth.currentUser) {
      currentToken = await auth.currentUser.getIdToken();
      if (currentToken !== token) {
        setToken(currentToken);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('authToken', currentToken);
        }
      }
    }

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(currentToken && { 'Authorization': `Bearer ${currentToken}` }),
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
    registerWithFirebase,
    login,
    loginWithFirebase,
    signInWithGoogle,
    resetPassword,
    logout,
    apiCall,
    isAuthenticated: !!user && !!token,
    token,
    authMethod,
  };

  // Show terminal loading while checking auth state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000000',
        color: '#00FF00',
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1rem'
      }}>
        <div>
          <span style={{ color: '#00FF00' }}>[</span>
          <span style={{ animation: 'blink 1s infinite' }}>|</span>
          <span style={{ color: '#00FF00' }}>]</span>
          <span> INITIALIZING AUTH...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
