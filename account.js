import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { auth, db } from "./firebase.js";

let currentUser = null;

// =========================
// 👤 Load User Profile
// =========================
async function loadUserProfile() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) return resolve();

      currentUser = user;

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          const addr = data.address || {};

          // Update form fields
          document.getElementById("first-name").value = data.firstName || "";
          document.getElementById("last-name").value = data.lastName || "";
          document.getElementById("phone").value = data.phone || "";
          document.getElementById("birthday").value = data.birthday || "";

          document.getElementById("house-number").value = addr.houseNumber || "";
          document.getElementById("street").value = addr.street || "";
          document.getElementById("city").value = addr.city || "";
          document.getElementById("county").value = addr.county || "";
          document.getElementById("postcode").value = addr.postcode || "";

          // Update summary display
          updateSummary(data.firstName, data.lastName, data.phone, data.birthday, addr);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      }

      resolve();
    });
  });
}

// =========================
// 📝 Update Summary
// =========================
function updateSummary(firstName, lastName, phone, birthday, address) {
  document.getElementById("summary-name").textContent = `${firstName || "-"} ${lastName || ""}`;
  document.getElementById("summary-phone").textContent = phone || "-";
  document.getElementById("summary-birthday").textContent = birthday || "Not set";

  const addressString = `${address.houseNumber || ""} ${address.street || ""}, ${address.city || ""}, ${address.county || ""}, ${address.postcode || ""}`.trim();
  document.getElementById("summary-address").textContent = addressString || "No saved addresses.";
}

// =========================
// 💾 Save Profile Info
// =========================
async function saveProfile(e) {
  e.preventDefault();
  if (!currentUser) return alert("You must be logged in to save your profile.");

  const firstName = document.getElementById("first-name").value.trim();
  const lastName = document.getElementById("last-name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const birthday = document.getElementById("birthday").value.trim();

  const address = {
    houseNumber: document.getElementById("house-number").value.trim(),
    street: document.getElementById("street").value.trim(),
    city: document.getElementById("city").value.trim(),
    county: document.getElementById("county").value.trim(),
    postcode: document.getElementById("postcode").value.trim(),
  };

  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      firstName,
      lastName,
      phone,
      birthday,
      address,
    });

    alert("Profile updated successfully!");
    updateSummary(firstName, lastName, phone, birthday, address);
    toggleEdit();
  } catch (err) {
    console.error("Failed to save profile:", err);
    alert("There was an error saving your profile.");
  }
}

// =========================
// ✏️ Toggle Edit Mode
// =========================
function toggleEdit() {
  document.getElementById("summary-block").classList.toggle("hidden");
  document.getElementById("form-block").classList.toggle("hidden");
}

// =========================
// 🚪 Logout
// =========================
function setupLogout() {
  const btn = document.getElementById("logoutBtn");
  if (btn) {
    btn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "/";
    });
  }
}

// =========================
// 🚀 Init Page
// =========================
document.addEventListener("DOMContentLoaded", async () => {
  await loadUserProfile();

  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) saveBtn.addEventListener("click", saveProfile);

  const editBtn = document.getElementById("editBtn");
  if (editBtn) editBtn.addEventListener("click", toggleEdit);

  const cancelBtn = document.getElementById("cancelBtn");
  if (cancelBtn) cancelBtn.addEventListener("click", toggleEdit);

  const addAddressBtn = document.getElementById("addAddressBtn");
  if (addAddressBtn) addAddressBtn.addEventListener("click", toggleEdit);

  setupLogout();
});
