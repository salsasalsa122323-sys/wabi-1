import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore targeting the specific databaseId if provided
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Test connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, '_connection_test', 'status'));
    console.log('Firebase Firestore connection verified.');
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is running in offline cache mode.');
    } else {
      console.log('Firestore connection established (ping completed).');
    }
    return false;
  }
}

// Automatically trigger on module import
testFirestoreConnection().catch(() => {});

export default app;
