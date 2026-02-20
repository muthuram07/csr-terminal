// Firebase Configuration
// Values are loaded from .env via REACT_APP_FIREBASE_* variables.
// Example: REACT_APP_FIREBASE_API_KEY=xxxx

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserSessionPersistence } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || ""
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence).catch((error) => {
    console.error('Failed to set Firebase session persistence:', error);
});

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

export default app;

// Expose auth for local debugging (dev only) so you can extract ID tokens
if (typeof window !== 'undefined') {
    try {
        window.__CSR_AUTH__ = auth;
        window.__CSR_APP__ = app;
    } catch (e) {
        // ignore in non-browser environments
    }
}
