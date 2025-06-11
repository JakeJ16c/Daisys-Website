// Import Firestore setup and tools
import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// Run everything inside an async IIFE
console.log("🛠 maintenance.js loaded");

(async () => {
  try {
    console.log("🔍 Entering async function...");

    // Detect if we're on the maintenance page
    const isMaintenancePage = window.location.pathname.includes("maintenance.html");
    console.log("📍 Page type:", isMaintenancePage ? "Maintenance Page" : "Normal Page");

    // Step 1: Try to get visitor's IP address (fail-safe)
    let userIP = "unknown";
    try {
      console.log("🌐 Fetching public IP...");
      const res = await fetch("https://checkip.amazonaws.com/");
      userIP = (await res.text()).trim();
      console.log("✅ IP fetched:", userIP);
    } catch (ipErr) {
      console.error("⚠️ Failed to fetch IP address:", ipErr);
    }

    // Step 2: Load maintenance settings from Firestore
    console.log("📡 Getting maintenance settings...");
    const snap = await getDoc(doc(db, "SiteSettings", "maintenance"));
    if (!snap.exists()) {
      console.warn("📭 Firestore doc not found: SiteSettings/maintenance");
      return;
    }

    const data = snap.data();
    const allowed = data.allowedIPs || [];
    const enabled = data.enabled === true;
    const isAllowed = allowed.includes(userIP);
    const isAdmin = localStorage.getItem("isAdmin") === "true";

    // Step 3: Logic for all normal pages → redirect to maintenance
    if (!isMaintenancePage) {
      if (enabled && !isAllowed && !isAdmin) {
        console.warn("🚧 Site is in maintenance mode. Blocking IP:", userIP);
        window.location.href = "/Daisys-Website/maintenance.html";
      } else {
        console.log("✅ Maintenance check passed. Access granted.");
      }
    }

    // Step 4: Logic for maintenance page → redirect back if unlocked
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
