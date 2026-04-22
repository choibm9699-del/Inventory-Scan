// src/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Firebase 콘솔에서 복사한 config를 여기에 붙여넣으세요
const firebaseConfig = {
   apiKey: "AIzaSyBiSty3FLJ8YdMMJ3t3RZ2W3kUQRrXT4k0",
    authDomain: "inventorybm-148de.firebaseapp.com",
    projectId: "inventorybm-148de",
    storageBucket: "inventorybm-148de.firebasestorage.app",
    messagingSenderId: "1021227878712",
    appId: "1:1021227878712:web:931419662e0e5b438019cd"

};

// 초기화
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app); // 이 'db'를 다른 파일에서 가져다 쓸 겁니다.