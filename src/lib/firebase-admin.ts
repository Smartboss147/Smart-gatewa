import { initializeApp, getApps } from 'firebase-admin/app';
import { cert } from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfigDefault from '../../firebase-applet-config.json';

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfigDefault.projectId;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    initializeApp({
      projectId,
    });
  }
}

export const adminAuth = getAuth();
