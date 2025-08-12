// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDaLNUwBnkePNQTTmobulDjCKxbYcrY_Jk",
  authDomain: "finkevin-fbd9a.firebaseapp.com",
  projectId: "finkevin-fbd9a",
  storageBucket: "finkevin-fbd9a.firebasestorage.app",
  messagingSenderId: "191264877497",
  appId: "1:191264877497:web:29b68850f516b71ad26468",
  measurementId: "G-NHL2KDXDJJ"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, analytics, db, auth, storage };
