import { auth, db } from "./firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const form=document.getElementById("loginForm");
const username=document.getElementById("username");
const password=document.getElementById("password");
const error=document.getElementById("loginError");
const toggle=document.getElementById("togglePassword");

toggle.onclick=()=>{
  const hidden=password.type==="password";
  password.type=hidden?"text":"password";
  toggle.textContent=hidden?"Sembunyikan":"Lihat";
};

form.onsubmit=async e=>{
  e.preventDefault();
  error.hidden=true;

  try{
    const credential=await signInWithEmailAndPassword(auth, username.value.trim(), password.value);
    const snap=await get(ref(db,`users/${credential.user.uid}`));
    const profile=snap.val()||{};
    const role=profile.role;

    if(profile.active===false){
      await signOut(auth);
      error.hidden=false;
      error.textContent="Akun ini sedang dinonaktifkan oleh Administrator.";
      return;
    }

    if(!["pengurus","ketua","developer"].includes(role)){
      await signOut(auth);
      error.hidden=false;
      error.textContent="Akun berhasil login, tetapi role belum terdaftar di Firebase.";
      return;
    }

    if(role==="ketua") location.replace("ketua.html");
    else if(role==="developer") location.replace("developer.html");
    else location.replace("admin.html");
  }catch(err){
    console.error(err);
    error.hidden=false;
    if(err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password" || err?.code === "auth/user-not-found"){
      error.textContent="Email atau password belum benar.";
    }else if(err?.code === "PERMISSION_DENIED" || err?.message?.includes("permission")){
      error.textContent="Login berhasil, tetapi data akun tidak bisa dibaca. Periksa Firebase Rules pada users/{UID}.";
    }else{
      error.textContent="Tidak bisa memeriksa akses akun. Coba lagi.";
    }
  }
};
