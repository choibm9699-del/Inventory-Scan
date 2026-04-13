// src/firebase.ts
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBiSty3FLJ8YdMMJ3t3RZ2W3kUQRrXT4k0",
    authDomain: "inventorybm-148de.firebaseapp.com",
    projectId: "inventorybm-148de",
    databaseURL : "https://inventorybm-148de-default-rtdb.asia-southeast1.firebasedatabase.app/",
    storageBucket: "inventorybm-148de.firebasestorage.app",
    messagingSenderId: "1021227878712",
    appId: "1:1021227878712:web:931419662e0e5b438019cd"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);