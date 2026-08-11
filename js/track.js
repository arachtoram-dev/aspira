import { db } from "./firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

const input=document.getElementById("trackCode"), result=document.getElementById("trackResult"), loading=document.getElementById("trackLoading");
const params=new URLSearchParams(location.search);
if(params.get("code")) input.value=params.get("code").toUpperCase();
document.getElementById("trackBtn").addEventListener("click", trackReport);
input.addEventListener("keydown",e=>{if(e.key==="Enter")trackReport();});

async function trackReport(){
  const code=input.value.trim().toUpperCase();
  if(!code){ result.hidden=false; result.classList.remove("hidden"); result.innerHTML='<div class="result-card"><strong>Masukkan kode pengaduan</strong><p class="meta">Isi kode yang kamu dapat setelah mengirim pengaduan.</p></div>'; return; }
  loading.hidden=false; result.hidden=true;
  try{
    const snap=await get(ref(db,`reports/${code}`));
    await new Promise(r=>setTimeout(r,350));
    loading.hidden=true; result.hidden=false; result.classList.remove("hidden");
    if(!snap.exists()){result.innerHTML='<div class="result-card"><strong>Kode pengaduan tidak ditemukan</strong><p class="meta">Coba cek lagi kodenya.</p></div>';return;}
    renderReport(snap.val());
  }catch(e){
    console.error(e); loading.hidden=true; result.hidden=false; result.classList.remove("hidden");
    const message = e?.code === "PERMISSION_DENIED"
      ? "Akses database ditolak. Periksa Firebase Database Rules."
      : "Periksa koneksi internet atau konfigurasi Firebase.";
    result.innerHTML=`<div class="result-card"><strong>Pengaduan belum bisa dicek</strong><p class="meta">${message}</p></div>`;
  }
}
function renderReport(report){
 const timeline=Array.isArray(report.timeline)?report.timeline:Object.values(report.timeline||{});
 const first=timeline[0];
 result.innerHTML=`<div class="result-card">
 <div class="track-topline"><div class="track-title"><strong>${esc(report.code)}</strong><span>·</span><span>${esc(report.title)}</span></div><div class="status status-${String(report.status||"Diterima").toLowerCase().replace(/\s+/g,"-")}">${esc(report.status||"Diterima")}</div></div>
 <div class="track-summary"><div><span>Departemen</span><strong>${esc(report.department||"-")}</strong></div><div><span>Section</span><strong>${esc(report.section||"-")}</strong></div></div>
 <div class="track-history"><div class="history-title">Perkembangan Pengaduan</div>${timeline.map((e,i)=>`<div class="public-event"><div class="public-event-marker ${i===timeline.length-1?"latest":""}"><div class="dot"></div></div><div class="public-event-content"><strong>${esc(e.title||"Pembaruan Pengaduan")}</strong><span>${esc(e.date||"-")}</span>${e.note?`<p>${esc(e.note)}</p>`:""}</div></div>`).join("")}</div>
 <button class="detail-toggle" id="detailToggle" type="button"><span>▾</span> Lihat Detail Laporan</button>
 <div id="reportDetail" class="report-detail" hidden>${buildDetail(report)}</div></div>`;
 document.getElementById("detailToggle").onclick=()=>{const d=document.getElementById("reportDetail"),b=document.getElementById("detailToggle");d.hidden=!d.hidden;b.innerHTML=d.hidden?"<span>▾</span> Lihat Detail Laporan":"<span>▴</span> Sembunyikan Detail Laporan";};
}
function buildDetail(r){const date=r.incidentDate?new Date(r.incidentDate+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"}):"Tidak diisi";return `<div class="detail-divider"></div><div class="detail-section"><div class="detail-section-title">Data Pelapor</div><div class="detail-grid"><div class="detail-item"><span>Nama</span><strong>${r.confidential?"Identitas dirahasiakan":esc(r.name||"-")}</strong></div><div class="detail-item"><span>NPK / Nomor Induk</span><strong>${r.confidential?"Identitas dirahasiakan":esc(r.npk||"-")}</strong></div><div class="detail-item"><span>Departemen</span><strong>${esc(r.department||"-")}</strong></div><div class="detail-item"><span>Section</span><strong>${esc(r.section||"-")}</strong></div></div></div><div class="detail-section"><div class="detail-section-title">Isi Pengaduan</div><div class="detail-item detail-full"><span>Kategori</span><strong>${esc(r.category||"-")}</strong></div><div class="detail-item detail-full"><span>Judul</span><strong>${esc(r.title||"-")}</strong></div><div class="story-box"><span>Ceritakan kejadiannya</span><p>${esc(r.description||"-").replace(/\n/g,"<br>")}</p></div></div><div class="detail-section"><div class="detail-section-title">Informasi Tambahan</div><div class="detail-grid"><div class="detail-item"><span>Tanggal kejadian</span><strong>${date}</strong></div><div class="detail-item"><span>Identitas</span><strong>${r.confidential?"Dirahasiakan":"Tidak dirahasiakan"}</strong></div></div><div class="attachment-box"><span>📎 Lampiran</span><strong>${r.attachmentName?"📷 "+esc(r.attachmentName):"Tidak ada lampiran"}</strong></div></div>`;}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
