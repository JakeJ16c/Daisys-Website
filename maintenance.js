import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

(async () => {
  try {
    const isMaintenancePage = window.location.pathname.includes("maintenance.html");

    // Step 1: Fetch visitor IP
    let userIP = "unknown";
    try {
      const res = await fetch("https://checkip.amazonaws.com/");
      userIP = (await res.text()).trim();
    } catch (ipErr) {
      console.error("⚠️ Failed to fetch IP address:", ipErr);
    }

    // Step 2: Get Firestore settings
    const snap = await getDoc(doc(db, "SiteSettings", "maintenance"));
    if (!snap.exists()) return;

    const data = snap.data();
    const allowed = data.allowedIPs || [];
    const enabled = data.enabled;
    const isAllowed = allowed.includes(userIP);
    const isAdmin = localStorage.getItem("isAdmin") === "true";

    // Step 3: Logic for normal site pages
    if (!isMaintenancePage) {
      if (enabled && !isAllowed && !isAdmin) {
        console.warn("🚧 Maintenance mode active. Blocking user IP:", userIP);
        window.location.href = "/Daisys-Website/maintenance.html";
      } else {
        console.log("✅ Maintenance check passed for IP:", userIP);
      }
    }

    // Step 4: Logic for maintenance.html → auto-unblock
    else {
      if (!enabled) {
        console.log("✅ Maintenance mode is now OFF. Redirecting back to site...");
        window.location.href = "/Daisys-Website/index.html";
      }
    }

  } catch (err) {
    console.error("🚨 Error in maintenance logic:", err);
  }
})();
