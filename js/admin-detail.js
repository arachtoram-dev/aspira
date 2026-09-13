import { db } from "./firebase-config.js";
import { ref, get, update } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";
import { requireRole } from "./admin-guard.js";

const code = new URLSearchParams(location.search).get("code")?.toUpperCase();
const container = document.getElementById("adminDetail");

function setupHeader(role) {
  const brand = document.getElementById("detailBrand");
  const subtitle = document.getElementById("detailSubtitle");
  const back = document.getElementById("detailBack");
  const roleBadge = document.getElementById("detailRoleBadge");
  const labels = {
    ketua: "KETUA",
    pengurus: "PENGURUS",
    developer: "DEVELOPER"
  };
  if (roleBadge) roleBadge.textContent = labels[role] || String(role || "").toUpperCase();

  if (role === "ketua") {
    if (brand) brand.href = "ketua.html";
    if (subtitle) subtitle.textContent = "Dashboard Ketua";
    if (back) { back.href = "ketua.html"; back.textContent = "← Kembali ke Dashboard Ketua"; }
  } else {
    if (brand) brand.href = role === "developer" ? "developer.html" : "admin.html";
    if (subtitle) subtitle.textContent = role === "developer" ? "Dashboard Developer" : "Dashboard Pengurus";
    if (back) { back.href = role === "developer" ? "developer.html" : "admin.html"; back.textContent = "← Kembali ke Daftar"; }
  }
}

requireRole(["pengurus", "ketua", "developer"], async (user, role) => {
  setupHeader(role);
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

  // Pengurus dan Ketua sama-sama dapat membuka serta memperbarui laporan.
  if (report.status === "Diterima") {
    const now = new Date().toLocaleString("id-ID");
    const timeline = Array.isArray(report.timeline)
      ? report.timeline
      : Object.values(report.timeline || {});

    timeline.push({
      title: "Laporan sedang di tinjau",
      date: now,
      note: "Pengaduan sudah dibuka dan sedang menunggu tindak lanjut."
    });

    showAspiraLoading('Memperbarui status...');
    try {
      await update(ref(db, `reports/${code}`), {
      status: "Dilihat",
      firstViewedAt: Date.now(),
      timeline
      });
      report = {...report, status: "Dilihat", firstViewedAt: Date.now(), timeline};
    } finally {
      hideAspiraLoading();
    }
  }

  render(report, role);
});

function render(r, role) {
  const date = r.incidentDate ? new Date(r.incidentDate + "T00:00:00").toLocaleDateString("id-ID", {day:"2-digit",month:"long",year:"numeric"}) : "Tidak diisi";
  const timeline = Array.isArray(r.timeline) ? r.timeline : Object.values(r.timeline || {});

  container.innerHTML = `
    <div class="admin-detail-head">
      <div><span class="eyebrow">DETAIL PENGADUAN</span><h1>${esc(r.title)}</h1><div class="admin-detail-code">${esc(r.code)}</div></div>
      <span class="status status-${String(r.status||"Diterima").toLowerCase().replace(/\s+/g,"-")}">${esc(r.status||"Diterima")}</span>
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
        <option value="Diterima" ${r.status==="Diterima"?"selected":""} ${statusRank(r.status) > 0 ? "disabled" : ""}>Diterima</option>
        <option value="Dilihat" ${r.status==="Dilihat"?"selected":""} ${statusRank(r.status) > 1 ? "disabled" : ""}>Dilihat</option>
        <option value="Diproses" ${r.status==="Diproses"?"selected":""} ${statusRank(r.status) > 2 ? "disabled" : ""}>Diproses</option>
        <option value="Selesai" ${r.status==="Selesai"?"selected":""}>Selesai</option>
      </select></label>
      <label>Catatan Tindak Lanjut<textarea id="adminNote" rows="4" placeholder="Tulis hasil tindak lanjut..."></textarea></label>
      <button id="saveAction" class="submit-btn">Simpan Tindak Lanjut <span>→</span></button>
      <div id="statusSuccessBox" class="status-confirm-success" hidden></div>
    </section>
    <section class="admin-panel"><div class="panel-title">Riwayat Tindak Lanjut</div>
      <div class="admin-timeline">${timeline.slice().reverse().map(e=>`
        <div class="admin-timeline-item"><div class="admin-timeline-dot"></div><div><strong>${esc(e.title)}</strong><span>${esc(e.date)}</span><p>${esc(e.note||"")}</p></div></div>`).join("")}</div>
    </section>`;

  document.getElementById("saveAction")?.addEventListener("click", () => save({...r, roleLabel: role === "ketua" ? "ketua" : role === "developer" ? "developer" : "pengurus"}));
}

function showStatusConfirm(oldStatus, newStatus, note, onConfirm) {
  const old = document.getElementById("aspiraConfirmBox");
  if (old) old.remove();
  const box = document.createElement("div");
  box.id = "aspiraConfirmBox";
  box.className = "status-confirm-overlay";
  box.innerHTML = `
    <div class="status-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
      <div class="status-confirm-icon">?</div>
      <div class="status-confirm-content">
        <h3 id="confirmTitle">Konfirmasi Perubahan Status</h3>
        <p>Apakah Anda yakin ingin mengubah status dari <strong>${esc(oldStatus)}</strong> menjadi <strong>${esc(newStatus)}</strong>?</p>
        ${note ? `<div class="status-confirm-note"><span>Catatan tindak lanjut</span><p>${esc(note)}</p></div>` : ""}
        <div class="status-confirm-actions">
          <button type="button" id="cancelStatusChange" class="secondary-btn">Batal</button>
          <button type="button" id="confirmStatusChange" class="submit-btn">Ya, Ubah Status</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(box);
  const close=()=>box.remove();
  box.querySelector("#cancelStatusChange").onclick=close;
  box.addEventListener("click",e=>{if(e.target===box)close();});
  box.querySelector("#confirmStatusChange").onclick=()=>{close();onConfirm();};
}

function showStatusSuccess(oldStatus, newStatus, roleLabel, note) {
  const box = document.getElementById("statusSuccessBox");
  if (!box) return;
  const changed = oldStatus !== newStatus;
  box.innerHTML = `<div class="status-confirm-success-icon">✓</div><div><strong>${changed ? "Status berhasil diubah" : "Tindak lanjut berhasil disimpan"}</strong><p>${changed ? `${esc(oldStatus)} → ${esc(newStatus)}` : "Catatan tindak lanjut berhasil diperbarui."}${note ? ` · ${esc(note)}` : ""}</p></div>`;
  box.hidden = false;
  box.scrollIntoView({behavior:"smooth", block:"nearest"});
}


async function save(r) {
  const status = document.getElementById("adminStatus").value;
  const note = document.getElementById("adminNote").value.trim();

  if (status === r.status && !note) {
    alert("Isi catatan atau ubah status terlebih dahulu.");
    return;
  }

  const oldStatus = r.status;
  const roleLabel = r.roleLabel || "pengguna";
  const oldRank = statusRank(oldStatus);
  const newRank = statusRank(status);

  // Status hanya boleh bergerak maju.
  if (newRank < oldRank) {
    alert(`Status tidak dapat dimundurkan dari ${oldStatus} menjadi ${status}. Status hanya dapat bergerak maju.`);
    return;
  }

  const proceed = async () => {
    const now = new Date().toLocaleString("id-ID");
    const timeline = Array.isArray(r.timeline) ? r.timeline : Object.values(r.timeline || {});
  const defaultNotes = {
    Diterima: "Pengaduan telah diterima dan menunggu proses tindak lanjut.",
    Dilihat: "Pengaduan sudah dibuka dan sedang menunggu tindak lanjut.",
    Diproses: "Pengaduan sedang dalam proses tindak lanjut.",
    Selesai: "Pengaduan telah selesai ditindaklanjuti."
  };

  timeline.push({
    title: status !== r.status ? `Status diubah menjadi ${status}` : "Catatan Tindak Lanjut",
    date: now,
    note: note || defaultNotes[status] || "Tindak lanjut pengaduan telah diperbarui."
  });

    showAspiraLoading('Menyimpan tindak lanjut...');
    try {
      await update(ref(db, `reports/${code}`), { status, timeline });
      hideAspiraLoading();
      const updated = { ...r, status, timeline };
      render(updated, roleLabel);
      showStatusSuccess(oldStatus, status, roleLabel, note);
    } catch (e) {
      hideAspiraLoading();
      alert('Perubahan belum berhasil disimpan. Coba lagi.');
    }
  };

  if (status !== oldStatus) {
    showStatusConfirm(oldStatus, status, note, proceed);
  } else {
    proceed();
  }
}

function statusRank(status) {
  return ({
    Diterima: 0,
    Dilihat: 1,
    Diproses: 2,
    Selesai: 3
  })[status] ?? 0;
}

function esc(v) {
  return String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
