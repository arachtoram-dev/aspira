import { db } from "./firebase-config.js";
import { ref, onValue, update } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";
import { requireRole, requirePengurus } from "./admin-guard.js";
import { auth } from "./firebase-config.js";

const listEl=document.getElementById("adminList");
const filter=document.getElementById("statusFilter");
const sortFilter=document.getElementById("sortFilter");
const search=document.getElementById("reportSearch");
const clearSearch=document.getElementById("clearSearch");
let reports=[];
let notificationSeenAt=0;
let notificationsSeen={};
let currentUser=null;

const isKetuaPage = location.pathname.endsWith("/ketua.html") || location.pathname.endsWith("\\ketua.html");
const startDashboardGuard = isKetuaPage
  ? (callback) => requireRole(["ketua"], callback)
  : requirePengurus;

startDashboardGuard((user, role)=>{
  currentUser=user;

  const devBackBtn=document.getElementById("devBackBtn");
  const badge=document.querySelector(".admin-badge");
  if(role==="developer"){
    if(devBackBtn) devBackBtn.hidden=false;
    if(badge) badge.textContent="DEVELOPER • PENGURUS";
  }else if(role==="ketua"){
    if(devBackBtn) devBackBtn.hidden=true;
    if(badge) badge.textContent="KETUA";
  }else{
    if(devBackBtn) devBackBtn.hidden=true;
    if(badge) badge.textContent="PENGURUS";
  }

  onValue(ref(db, `users/${user.uid}/notificationSeenAt`), snap=>{
    notificationSeenAt=Number(snap.val()||0);
    renderNotifications();
  });

  onValue(ref(db, `users/${user.uid}/notificationsSeen`), snap=>{
    notificationsSeen=snap.val()||{};
    renderNotifications();
  });

  onValue(ref(db,"reports"),snap=>{
    reports=Object.values(snap.val()||{});
    render();
    renderNotifications();
  });
});

[filter,sortFilter].forEach(el=>el.addEventListener("change",render));
search.addEventListener("input",render);
clearSearch.addEventListener("click",()=>{search.value="";search.focus();render();});

function render(){
  renderAnalytics();
  const q=search.value.trim().toLowerCase();
  let data=filter.value==="all"?[...reports]:reports.filter(r=>r.status===filter.value);
  if(q)data=data.filter(r=>[r.code,r.title,r.name,r.npk,r.department,r.section,r.category,r.description].some(v=>String(v||"").toLowerCase().includes(q)));
  data.sort((a,b)=>{
    if(sortFilter.value==="title") return String(a.title||"").localeCompare(String(b.title||""),"id");
    const da=parseDate(a.createdAt),db=parseDate(b.createdAt);
    return sortFilter.value==="oldest"?da-db:db-da;
  });

  document.getElementById("statTotal").textContent=reports.length;
  document.getElementById("statNew").textContent=reports.filter(r=>r.status==="Diterima"||r.status==="Dilihat").length;
  document.getElementById("statProcess").textContent=reports.filter(r=>r.status==="Diproses").length;
  document.getElementById("statDone").textContent=reports.filter(r=>r.status==="Selesai").length;
  document.getElementById("reportCount").textContent=q||filter.value!=="all"?`${data.length} pengaduan ditemukan`:`${data.length} pengaduan`;
  clearSearch.hidden=!q;

  listEl.innerHTML=data.length?data.map(r=>`
    <article class="admin-report">
      <div class="admin-report-top"><div>
        <div class="admin-code">${esc(r.code)}</div><h3>${esc(r.title)}</h3>
        <p>${esc(r.department||"-")} · ${esc(r.section||"-")} · ${esc(r.category||"-")}</p>
      </div><span class="status">${esc(r.status||"Diterima")}</span></div>
      <div class="admin-report-bottom"><span>${esc(r.createdAt||"-")}</span>
        <button type="button" onclick="viewReport('${encodeURIComponent(r.code)}')">Lihat Pengaduan →</button>
      </div>
    </article>`).join(""):`<div class="empty-admin"><div>${q?"Pengaduan tidak ditemukan":"Belum ada pengaduan"}</div><span>${q?"Coba kata kunci atau filter lain.":"Pengaduan yang masuk akan muncul di sini."}</span></div>`;
}
window.viewReport=code=>location.href=`admin-detail.html?code=${code}`;
function parseDate(v){if(!v)return 0;const t=Date.parse(v);if(!Number.isNaN(t))return t;const m=String(v).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);return m?new Date(+m[3],+m[2]-1,+m[1]).getTime():0;}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}


const notificationBtn=document.getElementById("notificationBtn");
const notificationPanel=document.getElementById("notificationPanel");
const notificationCount=document.getElementById("notificationCount");
const notificationList=document.getElementById("notificationList");
const notificationSummary=document.getElementById("notificationSummary");
const markNotificationsRead=document.getElementById("markNotificationsRead");

notificationBtn?.addEventListener("click",()=>{
  const open=notificationPanel.hidden;
  notificationPanel.hidden=!open;
  notificationBtn.setAttribute("aria-expanded",String(open));
  if(open) renderNotifications();
});

document.addEventListener("click",event=>{
  if(!event.target.closest(".notification-wrap")){
    notificationPanel.hidden=true;
    notificationBtn?.setAttribute("aria-expanded","false");
  }
});

markNotificationsRead?.addEventListener("click",async()=>{
  if(!currentUser)return;
  const seen=Date.now();
  try{
    await update(ref(db,`users/${currentUser.uid}`),{notificationSeenAt:seen});
  }catch(error){
    console.error(error);
    alert("Notifikasi belum bisa ditandai sebagai sudah dibaca.");
  }
});

function getCreatedAtMs(report){
  if(Number(report.createdAtMs))return Number(report.createdAtMs);
  return parseDate(report.createdAt);
}

function getUnreadReports(){
  return reports
    .filter(r=>{
      const code=String(r.code||"");
      const created=getCreatedAtMs(r);
      // Reports created before the V15 baseline are treated as already read.
      // Reports after the baseline remain unread until that specific report is opened.
      return created>notificationSeenAt && !notificationsSeen[code];
    })
    .sort((a,b)=>getCreatedAtMs(b)-getCreatedAtMs(a));
}

function renderNotifications(){
  if(!notificationCount||!notificationList)return;

  const unread=getUnreadReports();
  notificationCount.textContent=unread.length>99?"99+":String(unread.length);
  notificationCount.hidden=unread.length===0;

  if(unread.length===0){
    notificationSummary.textContent="Tidak ada pengaduan baru yang belum dibaca.";
    notificationList.innerHTML=`
      <div class="notification-empty">
        <div class="notification-empty-icon">✓</div>
        <strong>Semua sudah dilihat</strong>
        <span>Pengaduan baru akan muncul di sini.</span>
      </div>`;
    return;
  }

  notificationSummary.textContent=`${unread.length} pengaduan baru menunggu dilihat.`;

  notificationList.innerHTML=unread.slice(0,8).map(r=>`
    <button class="notification-item" type="button" data-code="${esc(r.code)}">
      <span class="notification-dot"></span>
      <span class="notification-content">
        <strong>${esc(r.title||"Pengaduan baru")}</strong>
        <span>${esc(r.code)} · ${esc(r.department||"-")} · ${esc(r.section||"-")}</span>
        <small>${esc(r.createdAt||"-")}</small>
      </span>
      <span class="notification-arrow">›</span>
    </button>`).join("");

  notificationList.querySelectorAll(".notification-item").forEach(item=>{
    item.addEventListener("click",async()=>{
      const code=item.dataset.code;
      await markNotificationRead(code);
      location.href=`admin-detail.html?code=${encodeURIComponent(code)}`;
    });
  });
}

async function markNotificationRead(code){
  if(!currentUser || !code)return;
  try{
    await update(ref(db,`users/${currentUser.uid}/notificationsSeen`),{
      [code]: Date.now()
    });
  }catch(error){
    console.error(error);
  }
}

async function markAllNotificationsRead(){
  if(!currentUser)return;
  const unread=getUnreadReports();
  if(!unread.length)return;

  const updates={};
  const now=Date.now();
  unread.forEach(r=>{
    if(r.code) updates[r.code]=now;
  });

  try{
    await update(ref(db,`users/${currentUser.uid}/notificationsSeen`),updates);
  }catch(error){
    console.error(error);
  }
}

function renderAnalytics() {
  const actionReports = reports.filter(r => {
    const status = String(r.status || "Diterima");
    return status === "Diterima" || status === "Dilihat";
  });
  const actionAlert = document.getElementById("actionAlert");
  const actionText = document.getElementById("actionAlertText");

  if (actionReports.length) {
    actionAlert.hidden = false;
    actionText.textContent = `${actionReports.length} pengaduan masih menunggu tindak lanjut.`;
  } else {
    actionAlert.hidden = false;
    actionAlert.classList.add("action-alert-clear");
    actionText.textContent = "Semua pengaduan sudah memiliki tindak lanjut.";
    document.getElementById("actionAlertTitle").textContent = "Tidak ada yang tertunda";
    document.getElementById("actionAlertBtn").hidden = true;
  }

  renderBars("categoryStats", countBy("category"));
  renderBars("departmentStats", countBy("department"));
  renderTrend();
}

function countBy(field) {
  const map = {};
  reports.forEach(r => {
    const value = String(r[field] || "Lainnya").trim().replace(/\s+/g, " ") || "Lainnya";
    map[value] = (map[value] || 0) + 1;
  });
  return Object.entries(map).sort((a,b) => b[1] - a[1]).slice(0, 5);
}

function renderBars(id, entries) {
  const el = document.getElementById(id);
  if (!entries.length) {
    el.innerHTML = '<div class="analytics-empty">Belum ada data.</div>';
    return;
  }

  const max = Math.max(1, ...entries.map(x => Number(x[1]) || 0));
  el.innerHTML = entries.map(([label, value]) => `
    <div class="bar-row">
      <div class="bar-meta">
        <span title="${esc(label)}">${esc(label)}</span>
        <strong>${value}</strong>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${Math.min(100, Math.max(0, (value / max) * 100))}%"></div>
      </div>
    </div>
  `).join("");
}

function renderTrend() {
  const el = document.getElementById("trendChart");
  const now = new Date();
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const values = days.map(day => {
    return reports.filter(r => sameDay(parseDate(r.createdAt), day)).length;
  });

  const max = Math.max(...values, 1);
  document.getElementById("trendTotal").textContent =
    `${values.reduce((a,b) => a+b, 0)} laporan`;

  el.innerHTML = values.map((value, i) => {
    const height = value ? Math.max(12, value / max * 100) : 4;
    const label = days[i].toLocaleDateString("id-ID", {weekday:"short"});
    const date = days[i].toLocaleDateString("id-ID", {day:"2-digit", month:"2-digit"});
    return `
      <div class="trend-col">
        <div class="trend-bar-area">
          <div class="trend-bar" style="height:${height}%"></div>
          ${value ? `<span class="trend-value" style="bottom:calc(${height}% + 4px)">${value}</span>` : ""}
        </div>
        <strong>${label}</strong>
        <small>${date}</small>
      </div>`;
  }).join("");
}

function sameDay(timestamp, day) {
  if (!timestamp) return false;
  const d = new Date(timestamp);
  return d.getFullYear() === day.getFullYear()
    && d.getMonth() === day.getMonth()
    && d.getDate() === day.getDate();
}

document.getElementById("actionAlertBtn")?.addEventListener("click", () => {
  filter.value = "all";
  search.value = "";
  render();
  document.getElementById("adminList")?.scrollIntoView({behavior:"smooth", block:"start"});
});
