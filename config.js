/* Firebase settings for shared reports.
   Paste the web app config from the Firebase console here (Project settings > Your apps).
   These values are public by design; access is controlled by the Firestore rules in README.md.
   Leave as null to keep reports on each phone only. */
window.AKAGERA_FIREBASE = {// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCSXZUDGLGmvTHlo4eF3525mPMY9HHczXU",
  authDomain: "akagera-live-1dace.firebaseapp.com",
  projectId: "akagera-live-1dace",
  storageBucket: "akagera-live-1dace.firebasestorage.app",
  messagingSenderId: "387168737369",
  appId: "1:387168737369:web:1018bda53f6cee83fdf948"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);}
