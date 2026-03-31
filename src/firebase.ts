import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore with settings for better connectivity in restricted environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
}, firebaseConfig.firestoreDatabaseId);

// Test connection
async function testConnection() {
  try {
    console.log('[FIREBASE] Testing connection to Firestore...');
    const testDoc = await getDocFromServer(doc(db, 'settings', 'app'));
    if (testDoc.exists()) {
      console.log('[FIREBASE] Connection successful. App settings found.');
    } else {
      console.log('[FIREBASE] Connection successful. App settings not found (defaulting).');
    }
  } catch (error: any) {
    console.error('[FIREBASE] Connection test failed:', error.message);
    if (error.message.includes('the client is offline') || error.message.includes('network-request-failed')) {
      console.error("Please check your Firebase configuration or internet connection.");
    }
  }
}
testConnection();
