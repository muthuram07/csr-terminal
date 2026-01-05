// src/App.jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './styles/App.css';

const HomePage = lazy(() => import('./pages/Homepage'));
const SignInpage = lazy(() => import('./pages/SignInpage'));
const SignUppage = lazy(() => import('./pages/SignUppage'));
const ChatBot = lazy(() => import('./components/ChatBot/ChatBot'));

/** Small accessible loading fallback for Suspense */
function LoadingFallback() {
  return (
    <div role="status" style={{ padding: 24, textAlign: 'center' }}>
      Loading…
    </div>
  );
}

/** Route that only allows guests (unauthenticated users) */
function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

/** Route that requires authentication */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  return isAuthenticated ? children : <Navigate to="/signin" replace />;
}

/**
 * App
 * - Lazy-loads large pages to reduce initial bundle.
 * - Wraps app in AuthProvider.
 * - Uses route guards (GuestRoute, ProtectedRoute).
 */
export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />

            <Route
              path="/chatbot"
              element={
                <ProtectedRoute>
                  <ChatBot />
                </ProtectedRoute>
              }
            />

            <Route
              path="/signin"
              element={
                <GuestRoute>
                  <SignInpage />
                </GuestRoute>
              }
            />

            <Route
              path="/signup"
              element={
                <GuestRoute>
                  <SignUppage />
                </GuestRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}
