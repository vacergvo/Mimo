import * as firebaseApp from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD_G_PAGyTb7nsxjOBHm8clKobSCrdSn3M",
  authDomain: "mimo-97d25.firebaseapp.com",
  projectId: "mimo-97d25",
  storageBucket: "mimo-97d25.firebasestorage.app",
  messagingSenderId: "694133300771",
  appId: "1:694133300771:web:838e912da6c5c79d3bdb96",
  measurementId: "G-5G2THHVDD5"
};

const app = firebaseApp.initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);