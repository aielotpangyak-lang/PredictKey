import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with settings to handle potential network issues in preview environment
// We use the firestoreDatabaseId from the config if provided, otherwise default to '(default)'
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
}, (firebaseConfig as any).firestoreDatabaseId || '(default)');

// Test connection silently and don't throw blocking errors
console.log('[FIREBASE] Initialized with forced long polling.');
