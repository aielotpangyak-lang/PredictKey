import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Enable Firestore debug logging to help diagnose connectivity issues in the preview environment
setLogLevel('debug');

// Initialize Firestore with settings to handle potential network issues in preview environment
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
});

// Test connection silently and don't throw blocking errors
console.log('[FIREBASE] Initialized with forced long polling and debug logging.');
