import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (import.meta.env.DEV) {
  console.log('[Firebase] projectId:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const LEGACY_KEYS = [
  'bb_tasks',
  'bb_checklists',
  'bb_essentials',
  'bb_points',
  'bb_essential_alarm_theme',
  'bb_brain_dump_email',
  'bb_tutorial_seen',
] as const;

function userDataDoc(key: string, uid: string) {
  return doc(db, 'users', uid, 'userdata', key);
}

/** One-time copy from legacy flat `userdata/{key}` into `users/{uid}/userdata/{key}` */
export async function migrateLegacyUserData(uid: string): Promise<void> {
  try {
    const metaRef = doc(db, 'users', uid, 'profile', 'meta');
    const meta = await getDoc(metaRef);
    if (meta.exists() && meta.data()?.legacyImported) return;

    for (const key of LEGACY_KEYS) {
      const legacySnap = await getDoc(doc(db, 'userdata', key));
      if (legacySnap.exists()) {
        const data = legacySnap.data();
        const userSnap = await getDoc(userDataDoc(key, uid));
        if (!userSnap.exists()) {
          await setDoc(userDataDoc(key, uid), data);
        }
      }
    }
    await setDoc(metaRef, { legacyImported: true }, { merge: true });
    if (import.meta.env.DEV) console.log('[Firebase] legacy migration done for', uid);
  } catch (e) {
    console.warn('[Firebase] migration failed:', e);
  }
}

export async function loadFromFirestore<T>(key: string, fallback: T, uid: string): Promise<T> {
  try {
    const snap = await getDoc(userDataDoc(key, uid));
    if (import.meta.env.DEV) console.log('[Firebase] load', key, snap.exists());
    if (snap.exists()) {
      return (snap.data()?.value as T) ?? fallback;
    }
  } catch (e) {
    console.warn('[Firebase] load failed:', key, e);
  }
  return fallback;
}

export async function saveToFirestore(key: string, value: unknown, uid: string): Promise<void> {
  try {
    const clean = JSON.parse(JSON.stringify(value));
    await setDoc(userDataDoc(key, uid), { value: clean });
    if (import.meta.env.DEV) console.log('[Firebase] saved', key);
  } catch (e) {
    console.warn('[Firebase] save failed:', key, e);
  }
}
