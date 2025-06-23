import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

(async () => {
  try {
    const isMaintenancePage = window.location.pathname.includes("maintenance.html");

    // Step 1: Get IP
    let userIP = "unknown";
    try {
      const res = await fetch("https://checkip.amazonaws.com/");
      userIP = (await res.text()).trim();
      console.log("✅ IP fetched:", userIP);
    } catch (ipErr) {
      console.error("⚠️ Failed to fetch IP address:", ipErr);
    }

    // Step 2: Load Firestore settings
    const snap = await getDoc(doc(db, "SiteSettings", "maintenance"));
    if (!snap.exists()) return;

    const data = snap.data();

    const allowed = data.allowedIPs || [];
    const enabled = Boolean(data.enabled); // ✅ force into true/false
    const isAllowed = allowed.map(ip => ip.trim()).includes(userIP.trim());
    const isAdmin = localStorage.getItem("isAdmin") === "true";

    // Step 3: Block non-whitelisted users
    if (!isMaintenancePage) {
      if (enabled && !isAllowed && !isAdmin) {
        console.warn("🚧 Site is in maintenance mode. Blocking IP:", userIP);
        window.location.href = "/Daisys-Website/maintenance.html";
      } else {
        console.log("✅ Maintenance check passed. Access granted.");
      }
    }

    // Step 4: Auto-redirect from maintenance page if site is live
    else {
      if (!enabled) {
        console.log("✅ Maintenance is OFF. Redirecting to site...");
        window.location.href = "/Daisys-Website/index.html";
      } else {
        console.log("⏳ Still under maintenance.");
      }
    }

  } catch (err) {
    console.error("💥 Fatal error in maintenance check:", err);
  }
})();
