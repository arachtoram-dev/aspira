import { db } from "./firebase-config.js";
import { ref, get, update } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";
import { requirePengurus } from "./admin-guard.js";

const code = new URLSearchParams(location.search).get("code")?.toUpperCase();
const container = document.getElementById("adminDetail");

requirePengurus(async () => {
  if (!code) {
    container.innerHTML = '<div class="empty-admin"><div>Pengaduan tidak ditemukan</div></div>';
    return;
  }

  const snap = await get(ref(db, `reports/${code}`));
  if (!snap.exists()) {
    container.innerHTML = '<div class="empty-admin"><div>Pengaduan tidak ditemukan</div></div>';
    return;
  }
  let report = snap.val();

  // Automatic workflow:
  // Diterima -> Dilihat as soon as a pengurus opens the report.
  // It stays Dilihat until the pengurus explicitly saves a follow-up status.
  if (report.status === "Diterima") {
    const now = new Date().toLocaleString("id-ID");
    const timeline = Array.isArray(report.timeline)
      ? report.timeline
      : Object.values(report.timeline || {});

    timeline.push({
      title: "Laporan dilihat pengurus",
      date: now,
      note: "Pengaduan sudah dibuka dan sedang menunggu tindak lanjut pengurus."
    });

    await update(ref(db, `reports/${code}`), {
      status: "Dilihat",
      firstViewedAt: Date.now(),
      timeline
    });

    report = {...report, status: "Dilihat", firstViewedAt: Date.now(), timeline};
  }

  render(report);
});

function render(r) {
  const date = r.incidentDate ? new Date(r.incidentDate + "T00:00:00").toLocaleDateString("id-ID", {day:"2-digit",month:"long",year:"numeric"}) : "Tidak diisi";
  const timeline = Array.isArray(r.timeline) ? r.timeline : Object.values(r.timeline || {});

  container.innerHTML = `
    <div class="admin-detail-head">
      <div><span class="eyebrow">DETAIL PENGADUAN</span><h1>${esc(r.title)}</h1><div class="admin-detail-code">${esc(r.code)}</div></div>
      <span class="status">${esc(r.status)}</span>
    </div>
    <div class="admin-detail-grid">
      <section class="admin-panel"><div class="panel-title">Data Pelapor</div>
        <div class="admin-info-grid">
          <div><span>Nama</span><strong>${r.confidential?"Identitas dirahasiakan":esc(r.name||"-")}</strong></div>
          <div><span>NPK</span><strong>${r.confidential?"Identitas dirahasiakan":esc(r.npk||"-")}</strong></div>
          <div><span>Departemen</span><strong>${esc(r.department||"-")}</strong></div>
          <div><span>Section</span><strong>${esc(r.section||"-")}</strong></div>
        </div>
      </section>
      <section class="admin-panel"><div class="panel-title">Isi Pengaduan</div>
        <div class="admin-info-row"><span>Kategori</span><strong>${esc(r.category||"-")}</strong></div>
        <div class="admin-info-row"><span>Tanggal kejadian</span><strong>${date}</strong></div>
        <div class="admin-story">${esc(r.description||"-").replace(/\n/g,"<br>")}</div>
        <div class="admin-attachment">📎 ${r.attachmentName?esc(r.attachmentName):"Tidak ada lampiran"}</div>
      </section>
    </div>
    <section class="admin-panel action-panel"><div class="panel-title">Tindak Lanjut</div>
      <label>Ubah Status<select id="adminStatus">
        <option ${r.status==="Diterima"?"selected":""}>Diterima</option>
        <option ${r.status==="Dilihat"?"selected":""}>Dilihat</option>
        <option ${r.status==="Diproses"?"selected":""}>Diproses</option>
        <option ${r.status==="Selesai"?"selected":""}>Selesai</option>
      </select></label>
      <label>Catatan Pengurus<textarea id="adminNote" rows="5" placeholder="Tulis hasil tindak lanjut..."></textarea></label>
      <button id="saveAction" class="submit-btn">Simpan Tindak Lanjut <span>→</span></button>
    </section>
    <section class="admin-panel"><div class="panel-title">Riwayat Tindak Lanjut</div>
      <div class="admin-timeline">${timeline.slice().reverse().map(e=>`
        <div class="admin-timeline-item"><div class="admin-timeline-dot"></div><div><strong>${esc(e.title)}</strong><span>${esc(e.date)}</span><p>${esc(e.note||"")}</p></div></div>`).join("")}</div>
    </section>`;

  document.getElementById("saveAction").onclick = () => save(r);
}

async function save(r) {
  const status = document.getElementById("adminStatus").value;
  const note = document.getElementById("adminNote").value.trim();

  if (status === r.status && !note) {
    alert("Isi catatan atau ubah status terlebih dahulu.");
    return;
  }

  const now = new Date().toLocaleString("id-ID");
  const timeline = Array.isArray(r.timeline) ? r.timeline : Object.values(r.timeline || {});
  timeline.push({
    title: status !== r.status ? `Status diubah menjadi ${status}` : "Catatan pengurus",
    date: now,
    note: note || "Status diperbarui oleh pengurus."
  });

  await update(ref(db, `reports/${code}`), { status, timeline });
  location.reload();
}

function esc(v) {
  return String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
