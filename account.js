// account.js
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
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
          document.getElementById("house-number").value = addr.houseNumber || "";
          document.getElementById("street").value = addr.street || "";
          document.getElementById("city").value = addr.city || "";
          document.getElementById("county").value = addr.county || "";
          document.getElementById("postcode").value = addr.postcode || "";

          // Update summary display
          updateSummary(data.firstName, data.lastName, data.phone, addr);
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
function updateSummary(firstName, lastName, phone, address) {
  document.getElementById("summary-name").textContent = `${firstName || "-"} ${lastName || ""}`;
  document.getElementById("summary-phone").textContent = phone || "-";
  document.getElementById("summary-address").textContent =
    `${address.houseNumber || ""} ${address.street || ""}, ${address.city || ""}, ${address.county || ""}, ${address.postcode || ""}`.trim() || "-";
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
      address,
    });

    alert("Profile updated successfully!");
    updateSummary(firstName, lastName, phone, address);
    toggleEdit();
  } catch (err) {
    console.error("Failed to save profile:", err);
    alert("There was an error saving your profile.");
  }
}

// =========================
// 📦 Load User Orders
// =========================
async function loadUserOrders(user) {
  const ordersRef = collection(db, "Orders");
  const q = query(ordersRef, where("userId", "==", user.uid));
  const snapshot = await getDocs(q);

  const ordersDiv = document.getElementById("user-orders");
  if (snapshot.empty) {
    ordersDiv.innerHTML = `<p>You haven't placed any orders yet.</p>`;
    return;
  }

  let html = "";
  snapshot.forEach((docSnap) => {
    const order = docSnap.data();
    const date = order.createdAt?.toDate().toLocaleString() || "Unknown date";

    html += `
      <div class="order-card">
        <div class="order-summary" onclick="this.classList.toggle('open'); this.nextElementSibling.classList.toggle('open')">
          <div class="summary-left">
              <strong>Order No.${order.orderNumber || "N/A"}</strong>
          </div>
          <div class="summary-right">
            <span class="order-status ${order.status.toLowerCase()}">Status: ${order.status}</span>
            <i class="fa fa-chevron-down"></i>
          </div>
        </div>
        <div class="order-details">
          <p class="order-date">Placed on: ${date}</p>
          <ul>
            ${
              Array.isArray(order.items)
                ? order.items.map(item => `<li>${item.productName} × ${item.qty} – £${item.price.toFixed(2)}</li>`).join("")
                : "<li>No items found in this order.</li>"
            }
          </ul>
        </div>
      </div>
    `;
  });

  ordersDiv.innerHTML = html;
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
      window.location.href = "index.html";
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

  if (currentUser) {
    loadUserOrders(currentUser);
  }

  setupLogout();
});
