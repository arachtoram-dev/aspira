import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDWJTMBLqbELlAFk74T7IKvDuhHMuNUe8A",
  authDomain: "aspira-e7706.firebaseapp.com",
  databaseURL: "https://aspira-e7706-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aspira-e7706",
  storageBucket: "aspira-e7706.firebasestorage.app",
  messagingSenderId: "38355235",
  appId: "1:38355235:web:889e6a53356930486f0c96"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export { app };
