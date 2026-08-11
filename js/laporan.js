import { db } from "./firebase-config.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";

const form = document.getElementById("reportForm");

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < 8; i++) value += chars[Math.floor(Math.random() * chars.length)];
  return "ASP-" + value;
}


// Daftar sementara. Nanti cukup ubah bagian ini ketika data resmi sudah tersedia.
// Data lama di Firebase tidak ikut berubah.
const DEPARTMENT_SECTIONS = {
  "Produksi": ["Stamping", "Welding", "Assembly", "Painting", "Line Produksi", "Lainnya"],
  "Quality": ["Incoming Quality", "Process Quality", "Final Inspection", "Quality Control", "Lainnya"],
  "PPIC": ["Planning", "Production Control", "Material Control", "Lainnya"],
  "Maintenance": ["Maintenance Mesin", "Electrical", "Utility", "Lainnya"],
  "Warehouse / Logistik": ["Warehouse", "Material Handling", "Logistik", "Lainnya"],
  "Engineering": ["Process Engineering", "Product Engineering", "Tooling", "Lainnya"],
  "HR / GA": ["HR", "General Affair", "Recruitment", "Lainnya"],
  "Safety / K3": ["Safety", "K3", "Lainnya"],
  "Purchasing": ["Purchasing", "Procurement", "Lainnya"],
  "Finance / Accounting": ["Finance", "Accounting", "Lainnya"],
  "IT": ["IT Support", "Infrastructure", "Lainnya"],
  "Lainnya": ["Lainnya"]
};

const departmentSelect = document.getElementById("department");
const sectionSelect = document.getElementById("section");

Object.keys(DEPARTMENT_SECTIONS).forEach(department => {
  const option = document.createElement("option");
  option.value = department;
  option.textContent = department;
  departmentSelect.appendChild(option);
});

departmentSelect.addEventListener("change", () => {
  const sections = DEPARTMENT_SECTIONS[departmentSelect.value] || [];

  sectionSelect.innerHTML = '<option value="">Pilih section</option>';
  sections.forEach(section => {
    const option = document.createElement("option");
    option.value = section;
    option.textContent = section;
    sectionSelect.appendChild(option);
  });

  sectionSelect.disabled = sections.length === 0;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submit = form.querySelector("button[type='submit']");
  submit.disabled = true;
  submit.innerHTML = 'Mengirim... <span>↗</span>';

  const code = generateCode();
  const report = {
    code,
    name: document.getElementById("name").value.trim(),
    npk: document.getElementById("npk").value.trim(),
    department: document.getElementById("department").value.trim(),
    section: document.getElementById("section").value.trim(),
    category: document.getElementById("category").value,
    title: document.getElementById("title").value.trim(),
    description: document.getElementById("description").value.trim(),
    incidentDate: document.getElementById("incidentDate").value || "",
    attachmentName: document.getElementById("attachment").files[0]?.name || "",
    confidential: document.getElementById("confidential").checked,
    createdAt: new Date().toLocaleString("id-ID"),
    createdAtMs: Date.now(),
    status: "Diterima",
    timeline: [{
      title: "Pengaduan diterima",
      date: new Date().toLocaleString("id-ID"),
      note: "Pengaduan berhasil masuk ke sistem ASPIRA."
    }]
  };

  try {
    await set(ref(db, `reports/${code}`), report);
    sessionStorage.setItem("aspiraLastCode", code);
    window.location.href = "sukses.html";
  } catch (error) {
    console.error(error);
    submit.disabled = false;
    submit.innerHTML = 'Kirim Pengaduan <span>→</span>';
    alert("Pengaduan belum berhasil dikirim. Coba lagi.");
  }
});
