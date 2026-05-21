// src/firebase.ts
import {
  initializeApp,
  getApps,
  getApp,
} from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth"; //

const firebaseConfig = {
  apiKey: "AIzaSyBiSty3FLJ8YdMMJ3t3RZ2W3kUQRrXT4k0",
  authDomain: "inventorybm-148de.firebaseapp.com",
  projectId: "inventorybm-148de",
  databaseURL:
    "https://inventorybm-148de-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "inventorybm-148de.firebasestorage.app",
  messagingSenderId: "1021227878712",
  appId: "1:1021227878712:web:931419662e0e5b438019cd",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);