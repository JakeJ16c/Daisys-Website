import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc, addDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { auth, db } from "./firebase.js";

let currentUser = null;

// =========================
// 👤 Load User Profile + Addresses
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
          document.getElementById("first-name").value = data.firstName || "";
          document.getElementById("last-name").value = data.lastName || "";
          document.getElementById("phone").value = data.phone || "";
          document.getElementById("birthday").value = data.birthday || "";
          updateSummary(data.firstName, data.lastName, data.phone, data.birthday);
        }

        await renderAddresses();
      } catch (err) {
        console.error("Error loading profile:", err);
      }

      resolve();
    });
  });
}

// =========================
// 📦 Render Address Cards
// =========================
async function renderAddresses() {
  const addressList = document.getElementById("address-list");
  addressList.innerHTML = "";

  const addressRef = collection(db, "users", currentUser.uid, "addresses");
  const snapshot = await getDocs(addressRef);

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = `address-card ${data.default ? "default" : ""}`;

    div.innerHTML = `
      <div class="address-header">
        <div class="address-line">
          <strong>${data.houseNumber || ""} ${data.street || ""}</strong>
          ${data.default ? '<span class="default-badge">Default</span>' : ""}
        </div>
        <div class="address-details">${data.city || ""}</div>
        <div class="address-details">${data.county || ""}</div>
        <div class="address-details">${data.postcode || ""}</div>
      </div>
      <div class="address-actions">
        ${!data.default ? `<button class="set-default" data-id="${docSnap.id}"><i class="fa-solid fa-star"></i></button>` : ""}
        <button class="edit" data-id="${docSnap.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="delete" data-id="${docSnap.id}"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;

    addressList.appendChild(div);
  });

  attachAddressActions();
}

// =========================
// 🎯 Attach Action Handlers
// =========================
function attachAddressActions() {
  document.querySelectorAll(".set-default").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      await setDefaultAddress(id);
    });
  });

  document.querySelectorAll(".delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (confirm("Delete this address?")) {
        await deleteDoc(doc(db, "users", currentUser.uid, "addresses", id));
        await renderAddresses();
      }
    });
  });
}

// =========================
// 🌟 Set Default Address
// =========================
async function setDefaultAddress(id) {
  const addressRef = collection(db, "users", currentUser.uid, "addresses");
  const snapshot = await getDocs(addressRef);

  const batchOps = [];
  snapshot.forEach((docSnap) => {
    const isDefault = docSnap.id === id;
    batchOps.push(updateDoc(doc(db, "users", currentUser.uid, "addresses", docSnap.id), {
      default: isDefault,
    }));
  });

  await Promise.all(batchOps);
  await renderAddresses();
}

// =========================
// ➕ Add Address Modal
// =========================
function openModal() {
  document.getElementById("addressModal").classList.remove("hidden");
}
function closeModal() {
  document.getElementById("addressModal").classList.add("hidden");
}

async function submitNewAddress(e) {
  e.preventDefault();
  if (!currentUser) return alert("You must be logged in to add an address.");

  const houseNumber = document.getElementById("modal-house-number").value.trim();
  const street = document.getElementById("modal-street").value.trim();
  const city = document.getElementById("modal-city").value.trim();
  const county = document.getElementById("modal-county").value.trim();
  const postcode = document.getElementById("modal-postcode").value.trim();

  if (!houseNumber || !street || !city || !county || !postcode) return alert("Please fill in all fields.");

  try {
    const ref = collection(db, "users", currentUser.uid, "addresses");
    await addDoc(ref, { houseNumber, street, city, county, postcode, default: false });
    closeModal();
    await renderAddresses();
  } catch (err) {
    console.error("Failed to add address:", err);
    alert("Could not save address.");
  }
}

// =========================
// ✏️ Toggle Profile Edit Mode with Icon
// =========================
function toggleProfileEditMode(enable) {
  const formBlock = document.getElementById("form-block");
  const summaryBlock = document.getElementById("summary-block");
  const editActions = document.getElementById("edit-actions");

  formBlock.classList.toggle("hidden", !enable);
  summaryBlock.classList.toggle("hidden", enable);
  editActions.classList.toggle("hidden", !enable);
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

  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      firstName,
      lastName,
      phone,
      birthday,
    }, { merge: true });

    alert("Profile updated!");
    toggleProfileEditMode(false);
  } catch (err) {
    console.error("Save error:", err);
    alert("Failed to save your profile.");
  }
}

// =========================
// 🧾 Update Summary
// =========================
function updateSummary(firstName, lastName, phone, birthday) {
  document.getElementById("summary-name").textContent = `${firstName || "-"} ${lastName || ""}`;
  document.getElementById("summary-phone").textContent = phone || "-";
  document.getElementById("summary-birthday").textContent = birthday || "Not set";
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

  const editAccountBtn = document.getElementById("editAccountBtn");
  if (editAccountBtn) editAccountBtn.addEventListener("click", () => toggleProfileEditMode(true));

  const cancelBtn = document.getElementById("cancelBtn");
  if (cancelBtn) cancelBtn.addEventListener("click", () => toggleProfileEditMode(false));

  const modalForm = document.getElementById("addAddressForm");
  if (modalForm) modalForm.addEventListener("submit", submitNewAddress);

  window.addEventListener("click", (e) => {
    const addressModal = document.getElementById("addressModal");
    if (e.target === addressModal) {
      closeModal();
    }
  });

  setupLogout();
});
