import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDwTe6xmJSbCWdzOMhDUVDb_mVLTydHgt0',
  authDomain: 'unistay-f7589.firebaseapp.com',
  projectId: 'unistay-f7589',
  storageBucket: 'unistay-f7589.firebasestorage.app',
  messagingSenderId: '232556176138',
  appId: '1:232556176138:web:be8777af5fef5b6e2710f3',
  measurementId: 'G-P66EN5XVZN',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
