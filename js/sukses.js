const code = sessionStorage.getItem("aspiraLastCode");
const codeEl = document.getElementById("generatedCode");
if (code) {
  codeEl.textContent = code;
  document.getElementById("trackLink").href = "track.html?code=" + encodeURIComponent(code);
}
document.getElementById("copyBtn").addEventListener("click", async () => {
  if (!code) return;
  try { await navigator.clipboard.writeText(code); document.getElementById("copyBtn").textContent="Kode Tersalin ✓"; }
  catch { document.getElementById("copyBtn").textContent=code; }
});
