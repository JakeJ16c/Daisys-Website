import { db } from "../firebase.js";
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// Load saved modal from Firestore and render the preview
async function renderWelcomeModalPreview() {
  const ref = doc(db, "SiteSettings", "WelcomeModal");
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const previewBox = document.getElementById("welcomePreviewBox");
  const img = document.getElementById("previewImage");
  const headline = document.getElementById("preview-headline");
  const message = document.getElementById("preview-message");
  const cta = document.getElementById("preview-cta");

  previewBox.style.backgroundColor = data.backgroundColor || "#fff3cd";
  previewBox.style.backgroundImage = data.backgroundImage ? `url(${data.backgroundImage})` : "";
  previewBox.style.backgroundSize = "cover";
  img.src = data.image || "";
  headline.textContent = data.headline || "Welcome to You're So Golden!";
  message.textContent = data.message || "Explore our handcrafted bead collections and unique gifts.";
  cta.textContent = data.cta || "Shop Now";
  cta.style.backgroundColor = data.ctaColor || "#204ECF";
}

// Open full modal editor
document.querySelector(".welcome-modal-preview .edit-icon")?.addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("welcomeModalFull").classList.remove("hidden");
});

// Close modal editor
window.closeFullModal = function () {
  document.getElementById("welcomeModalFull").classList.add("hidden");
};

// Live edit logic (updates full modal editor in real time)
["headlineInput", "messageInput", "ctaInput", "bgColorInput", "ctaColorInput"].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;

  el.addEventListener("input", () => {
    const val = el.value;
    switch (id) {
      case "headlineInput":
        document.getElementById("modalTitle").textContent = val;
        break;
      case "messageInput":
        document.getElementById("modalSubtitle").textContent = val;
        break;
      case "ctaInput":
        document.getElementById("modalCTA").textContent = val;
        break;
      case "bgColorInput":
        document.getElementById("welcomeModalFull").style.backgroundColor = val;
        break;
      case "ctaColorInput":
        document.getElementById("modalCTA").style.backgroundColor = val;
        break;
    }
  });
});

// Image upload
document.getElementById("bgImageInput")?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById("modalPreviewImage").src = reader.result;
    document.getElementById("welcomeModalFull").style.backgroundImage = `url('${reader.result}')`;
  };
  reader.readAsDataURL(file);
});

// Save to Firestore
document.getElementById("saveModalBtn")?.addEventListener("click", async () => {
  const ref = doc(db, "SiteSettings", "WelcomeModal");
  const modalData = {
    headline: document.getElementById("headlineInput").value,
    message: document.getElementById("messageInput").value,
    cta: document.getElementById("ctaInput").value,
    backgroundColor: document.getElementById("bgColorInput").value,
    ctaColor: document.getElementById("ctaColorInput").value,
    backgroundImage: document.getElementById("modalPreviewImage").src,
    image: document.getElementById("modalPreviewImage").src
  };
  await setDoc(ref, modalData);
  alert("✅ Modal saved!");
  renderWelcomeModalPreview(); // Optional: to refresh preview after save
});

// Initial load
renderWelcomeModalPreview();
