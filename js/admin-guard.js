import { auth, db } from "./firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-database.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

export function requireRole(allowedRoles, onReady) {
  onAuthStateChanged(auth, async user => {
    if (!user) {
      location.replace("admin-login.html");
      return;
    }

    try {
      const snap = await get(ref(db, `users/${user.uid}`));
      const profile = snap.val() || {};
      const role = profile.role;
      const active = profile.active !== false;

      if (!active) {
        await signOut(auth);
        alert("Akun ini sedang dinonaktifkan oleh Administrator.");
        location.replace("admin-login.html");
        return;
      }

      if (!allowedRoles.includes(role)) {
        await signOut(auth);
        alert("Akun ini tidak memiliki akses ke halaman tersebut.");
        location.replace("admin-login.html");
        return;
      }

      onReady(user, role, profile);
    } catch (error) {
      console.error(error);
      alert("Hak akses belum bisa diverifikasi.");
      location.replace("admin-login.html");
    }
  });
}

export const ROLE_LEVEL = {
  pengurus: 1,
  ketua: 2,
  developer: 3
};

export function requirePengurus(onReady) {
  requireRole(["pengurus", "developer"], onReady);
}

export function canManageRole(actorRole, targetRole) {
  return (ROLE_LEVEL[actorRole] || 0) > (ROLE_LEVEL[targetRole] || 0);
}

export function redirectByRole(role) {
  if (role === "ketua") location.replace("ketua.html");
  else if (role === "developer") location.replace("developer.html");
  else location.replace("admin.html");
}
