import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { auth, db } from "./firebase.js";

let currentUser = null;
let userAddresses = [];

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
          userAddresses = data.addresses || [];

          // Update form fields
          document.getElementById("first-name").value = data.firstName || "";
          document.getElementById("last-name").value = data.lastName || "";
          document.getElementById("phone").value = data.phone || "";
          document.getElementById("birthday").value = data.birthday || "";

          updateSummary(data.firstName, data.lastName, data.phone);
          renderAddressCards(userAddresses);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      }

      resolve();
    });
  });
}

// =========================
// 📝 Update summary text
// =========================
function updateSummary(firstName, lastName, phone) {
  document.getElementById("summary-name").textContent = `${firstName || "-"} ${lastName || ""}`;
  document.getElementById("summary-phone").textContent = phone || "-";
}

// =========================
// 🧾 Render Address Cards
// =========================
function renderAddressCards(addresses) {
  const container = document.getElementById("address-list");
  container.innerHTML = "";

  if (addresses.length === 0) {
    container.innerHTML = "<p>No saved addresses.</p>";
    return;
  }

  addresses.forEach((addr, index) => {
    const card = document.createElement("div");
    card.className = "address-card" + (addr.default ? " default" : "");

    card.innerHTML = `
      <div class="address-card-header">
        <strong>${addr.houseNumber} ${addr.street}</strong>
        ${addr.default ? '<span class="badge">Default</span>' : ""}
      </div>
      <p>${addr.city}, ${addr.county}, ${addr.postcode}</p>
      <div class="address-card-actions">
        ${!addr.default ? `<button class="set-default" data-index="${index}">Set as Default</button>` : ""}
        <button class="edit" data-index="${index}">Edit</button>
        <button class="delete" data-index="${index}">Delete</button>
      </div>
    `;
    container.appendChild(card);
  });

  document.querySelectorAll(".set-default").forEach(btn => {
    btn.addEventListener("click", () => setAsDefault(btn.dataset.index));
  });

  document.querySelectorAll(".delete").forEach(btn => {
    btn.addEventListener("click", () => deleteAddress(btn.dataset.index));
  });

  // Edit button logic can be added as needed
}

// =========================
// ⭐ Set Default Address
// =========================
async function setAsDefault(index) {
  userAddresses = userAddresses.map((addr, i) => ({
    ...addr,
    default: i === Number(index)
  }));

  await updateDoc(doc(db, "users", currentUser.uid), {
    addresses: userAddresses
  });

  renderAddressCards(userAddresses);
}

// =========================
// 🗑️ Delete Address
// =========================
async function deleteAddress(index) {
  userAddresses.splice(index, 1);

  await updateDoc(doc(db, "users", currentUser.uid), {
    addresses: userAddresses
  });

  renderAddressCards(userAddresses);
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
  const birthday = document.getElementById("birthday").value;

  // Add new address from form
  const newAddress = {
    houseNumber: document.getElementById("house-number").value.trim(),
    street: document.getElementById("street").value.trim(),
    city: document.getElementById("city").value.trim(),
    county: document.getElementById("county").value.trim(),
    postcode: document.getElementById("postcode").value.trim(),
    default: userAddresses.length === 0, // Make default if it's the first address
  };

  userAddresses.push(newAddress);

  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      firstName,
      lastName,
      phone,
      birthday,
      addresses: userAddresses,
    });

    alert("Profile updated successfully!");
    updateSummary(firstName, lastName, phone);
    renderAddressCards(userAddresses);
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

  const cancelBtn = document.getElementById("cancelBtn");
  if (cancelBtn) cancelBtn.addEventListener("click", toggleEdit);
  setupLogout();
});
