// admin-auth.js
import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

// ← replace with Daisy’s real Firebase Auth UID
const DAISY_UID = "vsUOHot2HRabRLUOYFdBhQhOrSk1";

// 1) By default, make admin.html invisible
if (location.pathname.endsWith("admin.html")) {
  document.documentElement.style.visibility = "hidden";
}

onAuthStateChanged(auth, (user) => {
  // — NAV: show Dashboard link only if it's Daisy —
  const adminBtn = document.getElementById("admin-btn");
  if (adminBtn) {
    adminBtn.style.display = (user?.uid === DAISY_UID) ? "" : "none";
  }

  // — PROTECT admin.html itself —
  if (location.pathname.endsWith("admin.html")) {
    if (!user) {
      // not signed in at all → send to login
      return window.location.replace("login.html");
    }
    if (user.uid !== DAISY_UID) {
      // signed in as someone else → send to home
      return window.location.replace("index.html");
    }
    // OK Daisy → un-hide the page
    document.documentElement.style.visibility = "visible";
  }
});
