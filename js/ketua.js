import { db, auth } from "./firebase-config.js";
import { ref, get, update } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";
import { requireRole } from "./admin-guard.js";

const list=document.getElementById("userList");
const refresh=document.getElementById("refreshUsers");

requireRole(["ketua"], async ()=>{
  await renderUsers();
  refresh?.addEventListener("click",renderUsers);
});

async function renderUsers(){
  try{
    const snap=await get(ref(db,"users"));
    const users=snap.val()||{};
    const entries=Object.entries(users).filter(([uid,data])=>data?.role==="pengurus");
    const active=entries.filter(([_,data])=>data?.active!==false).length;
    const inactive=entries.length-active;

    setText("ketuaActiveCount",active);
    setText("ketuaInactiveCount",inactive);

    list.innerHTML=entries.length
      ? entries.map(([uid,data])=>card(uid,data)).join("")
      : '<div class="analytics-empty">Belum ada akun Pengurus.</div>';

    list.querySelectorAll(".ketua-account-action").forEach(btn=>{
      btn.addEventListener("click",()=>togglePengurus(btn.dataset.uid));
    });
  }catch(e){
    console.error(e);
    list.innerHTML='<div class="analytics-empty">Tidak bisa membaca akun Pengurus. Periksa Firebase Rules.</div>';
  }
}

function card(uid,data){
  const active=data?.active!==false;
  const name=data?.name||"Nama belum diatur";
  const email=data?.email||"Email belum diatur";
  const initials=name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
  return `<div class="ketua-account-card ${active?"":"is-inactive"}">
    <div class="account-avatar">${esc(initials||"?")}</div>
    <div class="ketua-account-main">
      <strong>${esc(name)}</strong>
      <span>${esc(email)}</span>
      <small>UID: ${esc(uid)}</small>
      <div class="ketua-account-meta">
        <span class="role-pill">PENGURUS</span>
        <span class="account-state ${active?"active":"inactive"}">${active?"AKTIF":"NONAKTIF"}</span>
      </div>
    </div>
    <button type="button" class="ketua-account-action ${active?"danger":""}" data-uid="${esc(uid)}">
      ${active?"Nonaktifkan":"Aktifkan"}
    </button>
  </div>`;
}

async function togglePengurus(uid){
  if(!uid || uid===auth.currentUser?.uid)return;
  const snap=await get(ref(db,`users/${uid}`));
  const data=snap.val();
  if(!data || data.role!=="pengurus"){
    alert("Akun tersebut bukan Pengurus atau sudah berubah role.");
    await renderUsers();
    return;
  }

  const active=data.active!==false;
  const action=active?"menonaktifkan":"mengaktifkan";
  if(!confirm(`Yakin ingin ${action} akun Pengurus ${data.name||uid}?`))return;

  try{
    await update(ref(db,`users/${uid}`),{
      active:!active,
      status:!active?"active":"inactive",
      updatedAtMs:Date.now()
    });
    await renderUsers();
  }catch(e){
    console.error(e);
    alert("Status akun gagal diubah. Pastikan Rules Firebase sudah dipublish.");
  }
}

function setText(id,value){
  const el=document.getElementById(id);
  if(el)el.textContent=value;
}
function esc(v){
  return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
