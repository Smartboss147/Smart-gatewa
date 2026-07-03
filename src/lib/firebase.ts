import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfigDefault from '../../firebase-applet-config.json';

const config = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || firebaseConfigDefault.apiKey,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigDefault.authDomain,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || firebaseConfigDefault.projectId,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigDefault.storageBucket,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigDefault.messagingSenderId,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || firebaseConfigDefault.appId,
};

const app = initializeApp(config);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
