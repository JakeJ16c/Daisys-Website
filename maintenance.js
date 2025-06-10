import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

(async () => {
  try {
    // Step 1: Fetch visitor IP (fallback-safe)
    let userIP = "unknown";
    try {
      const res = await fetch("https://checkip.amazonaws.com/");
      userIP = (await res.text()).trim();
    } catch (ipErr) {
      console.error("⚠️ Failed to fetch IP address:", ipErr);
    }

    // Step 2: Get maintenance settings
    const snap = await getDoc(doc(db, "SiteSettings", "maintenance"));
    if (!snap.exists()) return;

    const data = snap.data();
    const allowed = data.allowedIPs || [];
    const enabled = data.enabled;

    // Step 3: Redirect if enabled and user is not whitelisted
    const isAllowed = allowed.includes(userIP);
    const isAdmin = localStorage.getItem("isAdmin") === "true";

    if (enabled && !isAllowed && !isAdmin) {
      console.warn("🚧 Maintenance mode active. Blocking user IP:", userIP);
      window.location.href = "/Daisys-Website/maintenance.html";
    } else {
      console.log("✅ Maintenance check passed for IP:", userIP);
    }

  } catch (err) {
    console.error("🚨 Error running maintenance check:", err);
  }
})();
