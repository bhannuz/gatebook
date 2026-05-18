// firebase.js — Firebase initialisation
// ─────────────────────────────────────
// Your project credentials (keep this file out of public repos — use
// environment variables or Firebase App Hosting secrets in production).

import { initializeApp }              from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getFirestore }               from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { getAnalytics }               from "https://www.gstatic.com/firebasejs/11.8.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAnUvPo_G_efbacdDApbULQgY5OToghJYM",
  authDomain:        "gatebook-17065.firebaseapp.com",
  projectId:         "gatebook-17065",
  storageBucket:     "gatebook-17065.firebasestorage.app",
  messagingSenderId: "732765572762",
  appId:             "1:732765572762:web:55f1cb897bb5804a831923",
  measurementId:     "G-6YKLV11L0G",
};

const app       = initializeApp(firebaseConfig);
export const db = getFirestore(app);
getAnalytics(app);
