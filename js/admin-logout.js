import { auth } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

const button = document.getElementById("logoutBtn");

if (button) {
  button.addEventListener("click", async () => {
    if (button.dataset.busy === "1") return;
    button.dataset.busy = "1";
    button.disabled = true;
    const original = button.textContent;
    button.textContent = "Keluar...";

    try {
      await signOut(auth);
      // Replace prevents the protected page from remaining in navigation history.
      location.replace("admin-login.html");
    } catch (error) {
      console.error("Logout error:", error);
      button.dataset.busy = "0";
      button.disabled = false;
      button.textContent = original;
      alert("Belum bisa keluar. Pastikan koneksi internet aktif lalu coba lagi.");
    }
  });
}
