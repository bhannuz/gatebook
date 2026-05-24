// firebase.js — shared Firebase initialisation
// Keep this file out of public repos in production; use environment variables.

import { initializeApp }  from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getAnalytics }   from "https://www.gstatic.com/firebasejs/11.8.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAnUvPo_G_efbacdDApbULQgY5OToghJYM",
  authDomain:        "gatebook-17065.firebaseapp.com",
  projectId:         "gatebook-17065",
  storageBucket:     "gatebook-17065.firebasestorage.app",
  messagingSenderId: "732765572762",
  appId:             "1:732765572762:web:55f1cb897bb5804a831923",
  measurementId:     "G-6YKLV11L0G",
};

export const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);
getAnalytics(app);
