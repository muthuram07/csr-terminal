// src/pages/SignInpage.jsx
import React, { useEffect } from 'react';
import SignIn from '../components/Auth/SignIn';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * SignInpage
 * - Shows SignIn form for guests.
 * - Redirects authenticated users to home after auth load completes.
 * - Uses replace navigation to avoid back-button confusion.
 */
export default function SignInpage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <main className="auth-page" aria-busy="true" aria-live="polite">
        <div className="auth-container">
          <div className="auth-content">
            <div role="status">Checking authentication…</div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page" aria-live="polite">
      <div className="auth-container">
        <div className="auth-content">
          <SignIn />
        </div>
      </div>
    </main>
  );
}
