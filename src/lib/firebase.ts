import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log('[Firebase] projectId:', import.meta.env.VITE_FIREBASE_PROJECT_ID);

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export async function loadFromFirestore<T>(key: string, fallback: T): Promise<T> {
  try {
    const snap = await getDoc(doc(db, 'userdata', key));
    console.log('[Firebase] load', key, snap.exists());
    if (snap.exists()) {
      return snap.data()?.value as T ?? fallback;
    }
  } catch (e) {
    console.warn('[Firebase] load failed:', key, e);
  }
  return fallback;
}

export async function saveToFirestore(key: string, value: unknown): Promise<void> {
  try {
    // Strip undefined values — Firestore rejects them
    const clean = JSON.parse(JSON.stringify(value));
    await setDoc(doc(db, 'userdata', key), { value: clean });
    console.log('[Firebase] saved', key);
  } catch (e) {
    console.warn('[Firebase] save failed:', key, e);
  }
}
