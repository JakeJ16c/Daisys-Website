import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

(async () => {
  const [ipData, docSnap] = await Promise.all([
    fetch("https://api.ipify.org?format=json").then(res => res.json()),
    getDoc(doc(db, "SiteSettings", "maintenance"))
  ]);

  const userIP = ipData.ip;
  const data = docSnap.exists() ? docSnap.data() : {};
  const allowed = data.allowedIPs || [];

  if (data.enabled && !allowed.includes(userIP)) {
    window.location.href = "/Daisys-Website/maintenance.html";
  }
})();
