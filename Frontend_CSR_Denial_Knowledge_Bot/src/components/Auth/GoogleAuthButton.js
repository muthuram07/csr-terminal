import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../../config/firebase';
import '../../styles/terminal.css';

/**
 * GoogleAuthButton Component
 * Terminal-styled Google Authentication button
 * Command format: > auth --provider=google --execute
 */
function GoogleAuthButton({ onSuccess, onError, className = '' }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGoogleAuth = async () => {
        setIsLoading(true);
        setError('');

        try {
            if (!isFirebaseConfigured || !auth || !googleProvider) {
                throw new Error('Firebase is not configured for this local environment.');
            }

            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Call success callback with user data
            if (onSuccess) {
                onSuccess({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL
                });
            }
        } catch (error) {
            console.error('Google Auth Error:', error);

            let errorMessage = 'Authentication failed';

            // Handle specific Firebase auth errors
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
                case 'auth/network-request-failed':
                    errorMessage = 'Network error';
                    break;
                default:
                    errorMessage = error.message || 'Authentication failed';
            }

            setError(errorMessage);

            if (onError) {
                onError(errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`google-auth-container ${className}`}>
            <button
                onClick={handleGoogleAuth}
                disabled={isLoading || !isFirebaseConfigured}
                className="terminal-google-auth"
                title={!isFirebaseConfigured ? 'Firebase is not configured for this local environment.' : undefined}
            >
                {isLoading ? (
                    <span className="terminal-spinner">
                        <span className="term-green">[</span>
                        <span className="spinner-char">|</span>
                        <span className="term-green">]</span>
                        <span> AUTHENTICATING...</span>
                    </span>
                ) : (
                    <>
                        <span className="term-green">&gt;</span>
                        <span> auth --provider=google --execute</span>
                    </>
                )}
            </button>

            {error && (
                <div className="terminal-error" style={{ marginTop: '0.5rem' }}>
                    {error}
                </div>
            )}
        </div>
    );
}

export default GoogleAuthButton;
