// src/pages/SignUppage.jsx
import React, { useEffect } from 'react';
import SignUp from '../components/Auth/SignUp';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * SignUppage
 * - Shows SignUp form for guests.
 * - Redirects authenticated users to home after auth load completes.
 */
export default function SignUppage() {
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
          <SignUp />
        </div>
      </div>
    </main>
  );
}
