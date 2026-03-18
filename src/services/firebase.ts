import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';
import { initializeAuth, inMemoryPersistence, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let db: Database;
let auth: Auth;

function getApp(): FirebaseApp {
  if (!app) {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseDB(): Database {
  if (!db) {
    db = getDatabase(getApp());
  }
  return db;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    // inMemoryPersistence: no AsyncStorage dependency required.
    // Auth state is kept while the app is open; user logs in once per session.
    auth = initializeAuth(getApp(), { persistence: inMemoryPersistence });
  }
  return auth;
}
