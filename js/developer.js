import { db, auth, app } from "./firebase-config.js";
import { ref, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { requireRole, canManageRole } from "./admin-guard.js";

const list=document.getElementById("userList"), search=document.getElementById("userSearch"), filter=document.getElementById("accountStatusFilter");
const refresh=document.getElementById("refreshUsers"), createBtn=document.getElementById("createUserBtn");
const createMessage=document.getElementById("createUserMessage"), newName=document.getElementById("newUserName"), newEmail=document.getElementById("newUserEmail"), newPassword=document.getElementById("newUserPassword"), newRole=document.getElementById("newUserRole");
const editModal=document.getElementById("editUserModal"), editClose=document.getElementById("closeEditUser"), editCancel=document.getElementById("cancelEditUser"), updateBtn=document.getElementById("updateUserBtn");
const editUid=document.getElementById("editUserUid"), editName=document.getElementById("editUserName"), editEmail=document.getElementById("editUserEmail"), editRole=document.getElementById("editUserRole"), editTitle=document.getElementById("editUserTitle"), editMessage=document.getElementById("editUserMessage");
const actionModal=document.getElementById("accountActionModal"), actionClose=document.getElementById("closeActionModal"), actionTitle=document.getElementById("actionUserTitle"), actionMeta=document.getElementById("actionUserMeta"), actionToggle=document.getElementById("actionToggle"), actionDelete=document.getElementById("actionDelete"), actionMessage=document.getElementById("actionMessage");
let users={}, selectedUid=null;

const secondaryApp=initializeApp(app.options,"aspiraAccountCreatorV26"), secondaryAuth=getAuth(secondaryApp);

requireRole(["developer"],async()=>{await renderUsers();onValue(ref(db,"reports"),snap=>setText("devTotal",Object.keys(snap.val()||{}).length));});
refresh?.addEventListener("click",renderUsers); search?.addEventListener("input",renderUsers); filter?.addEventListener("change",renderUsers); createBtn?.addEventListener("click",createAccount);
editClose?.addEventListener("click",()=>editModal.hidden=true); editCancel?.addEventListener("click",()=>editModal.hidden=true); updateBtn?.addEventListener("click",saveEdit);
actionClose?.addEventListener("click",closeAction); actionToggle?.addEventListener("click",toggleAccount); actionDelete?.addEventListener("click",deleteProfile);

async function renderUsers(){
 try{
  const snap=await get(ref(db,"users")); users=snap.val()||{}; const entries=Object.entries(users),q=(search?.value||"").trim().toLowerCase(),f=filter?.value||"all";
  const active=entries.filter(([_,u])=>u?.active!==false).length;
  setText("activeUserCount",active);setText("inactiveUserCount",entries.length-active);setText("developerUserCount",entries.filter(([_,u])=>u?.role==="developer").length);setText("staffUserCount",entries.filter(([_,u])=>["pengurus","ketua"].includes(u?.role)).length);setText("devUsers",entries.length);
  const filtered=entries.filter(([uid,d])=>{const a=d?.active!==false,hay=[uid,d?.name,d?.email,d?.role,a?"aktif":"nonaktif"].join(" ").toLowerCase();return(!q||hay.includes(q))&&(f==="all"||(f==="active"&&a)||(f==="inactive"&&!a));});
  list.innerHTML=filtered.length?filtered.map(card).join(""):'<div class="analytics-empty">Tidak ada akun yang cocok.</div>';
  list.querySelectorAll(".account-card-action").forEach(b=>b.addEventListener("click",()=>openAction(b.dataset.uid)));
list.querySelectorAll(".account-card-edit").forEach(b=>b.addEventListener("click",()=>{
  openEditor(b.dataset.uid);
}));
 }catch(e){console.error(e);list.innerHTML='<div class="analytics-empty">Tidak bisa membaca akun. Pastikan Rules /users sudah dipublish dan akun ini memiliki role developer.</div>';}
}
function card([uid,d]){
 const a=d?.active!==false,role=d?.role||"-",initials=(d?.name||"?").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
 return `<div class="account-card ${a?"":"is-inactive"}"><div class="account-avatar">${esc(initials)}</div><div class="account-card-main"><div class="account-card-name">${esc(d?.name||"Nama belum diatur")}</div><div class="account-card-email">${esc(d?.email||"Email belum diatur")}</div><div class="account-card-meta"><span class="role-pill role-${String(role).toLowerCase()}">${esc(role)}</span><span class="account-state ${a?"active":"inactive"}">${a?"AKTIF":"NONAKTIF"}</span></div><small>UID: ${esc(uid)}</small></div><div class="account-card-actions">
  <button class="account-card-edit" type="button" data-uid="${esc(uid)}">Edit Profil</button>
  <button class="account-card-action" type="button" data-uid="${esc(uid)}">Kelola</button>
</div></div>`;
}
function openAction(uid){const d=users[uid];if(!d)return;selectedUid=uid;const a=d.active!==false;actionTitle.textContent=d.name||"Akun";actionMeta.innerHTML=`<strong>${esc(d.email||"-")}</strong><span>${esc(d.role||"-")} · UID ${esc(uid)}</span><span>Status: ${a?"Aktif":"Nonaktif"}</span>`;actionToggle.textContent=a?"Nonaktifkan Akun":"Aktifkan Akun";actionMessage.hidden=true;actionModal.hidden=false;}
function closeAction(){actionModal.hidden=true;selectedUid=null;}
async function toggleAccount(){if(!selectedUid)return;const d=users[selectedUid],a=d?.active!==false;if(!confirm(`Yakin ingin ${a?"menonaktifkan":"mengaktifkan"} akun ${d?.name||selectedUid}?`))return;try{await update(ref(db,`users/${selectedUid}`),{active:!a,status:!a?"active":"inactive",updatedAtMs:Date.now()});showMessage(actionMessage,`Akun berhasil ${!a?"diaktifkan":"dinonaktifkan"}.`,"success");await renderUsers();setTimeout(closeAction,500);}catch(e){showMessage(actionMessage,"Perubahan status gagal. Periksa Firebase Rules.","error");}}
async function changeRole(){if(!selectedUid)return;const d=users[selectedUid],role=actionRoleSelect.value;if(selectedUid===auth.currentUser?.uid){showMessage(actionMessage,"Role akun yang sedang login tidak dapat diubah.","error");return;}if(d?.role&&!canManageRole("developer",d.role)||!canManageRole("developer",role)){showMessage(actionMessage,"Role tidak dapat diubah.","error");return;}if(!confirm(`Ubah role ${d?.name||selectedUid} menjadi ${role}?`))return;try{await update(ref(db,`users/${selectedUid}`),{role,updatedAtMs:Date.now()});showMessage(actionMessage,"Role berhasil diubah.","success");await renderUsers();setTimeout(closeAction,500);}catch(e){showMessage(actionMessage,"Role gagal diubah.","error");}}
async function deleteProfile(){if(!selectedUid)return;const d=users[selectedUid];if(selectedUid===auth.currentUser?.uid){showMessage(actionMessage,"Akun yang sedang digunakan tidak dapat dihapus.","error");return;}if(!confirm(`Hapus data profil ${d?.name||selectedUid} dari Realtime Database?\n\nIni TIDAK menghapus akun Firebase Authentication.`))return;try{await remove(ref(db,`users/${selectedUid}`));showMessage(actionMessage,"Data profil berhasil dihapus.","success");await renderUsers();setTimeout(closeAction,600);}catch(e){showMessage(actionMessage,"Data profil gagal dihapus.","error");}}
function openEditor(uid){const d=users[uid];if(!d)return;editUid.value=uid;editName.value=d.name||"";editEmail.value=d.email||"";editRole.value=d.role||"pengurus";editTitle.textContent=d.name||uid;editMessage.hidden=true;editModal.hidden=false;}
async function saveEdit(){const uid=editUid.value,d=users[uid]||{},name=editName.value.trim(),email=editEmail.value.trim(),role=editRole.value;if(!name||!email){showMessage(editMessage,"Nama dan email wajib diisi.","error");return;}if(uid===auth.currentUser?.uid){showMessage(editMessage,"Akun yang sedang login tidak dapat diubah.","error");return;}if(uid===auth.currentUser?.uid && role!==d.role){showMessage(editMessage,"Role akun yang sedang login tidak dapat diubah.","error");return;}
if(!["pengurus","ketua","developer"].includes(role)){showMessage(editMessage,"Role tidak valid.","error");return;}
try{await update(ref(db,`users/${uid}`),{name,email,role,updatedAtMs:Date.now()});showMessage(editMessage,"Perubahan berhasil disimpan.","success");
await renderUsers();
setTimeout(()=>{editModal.hidden=true;},700);}catch(e){showMessage(editMessage,"Perubahan gagal disimpan.","error");}}
async function createAccount(){const name=newName.value.trim(),email=newEmail.value.trim(),password=newPassword.value,role=newRole.value;if(!name||!email||!password){showMessage(createMessage,"Nama, email, password, dan role wajib diisi.","error");return;}if(password.length<6){showMessage(createMessage,"Password minimal 6 karakter.","error");return;}createBtn.disabled=true;createBtn.textContent="Membuat akun...";try{const c=await createUserWithEmailAndPassword(secondaryAuth,email,password),uid=c.user.uid;await update(ref(db,`users/${uid}`),{name,email,role,active:true,status:"active",createdAtMs:Date.now()});await signOut(secondaryAuth);newName.value="";newEmail.value="";newPassword.value="";showMessage(createMessage,`Akun ${name} berhasil dibuat. UID: ${uid}`,"success");await renderUsers();}catch(e){console.error(e);showMessage(createMessage,e.code==="auth/email-already-in-use"?"Email sudah terdaftar.":"Akun gagal dibuat.","error");}finally{createBtn.disabled=false;createBtn.textContent="+ Buat Akun";}}
function showMessage(el,text,type){el.hidden=false;el.textContent=text;el.className=`form-message ${type}`;}function setText(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
