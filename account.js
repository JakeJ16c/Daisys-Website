// ==============================
// 🔥 IMPORTS (MUST COME FIRST)
// ==============================
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

import { app } from "./firebase.js";

const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

// ==============================
// 🚀 ON LOAD
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadUserProfile();
      await loadUserOrders();
    } else {
      console.warn("User not signed in.");
    }
  });

  const form = document.getElementById("profileForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await saveUserProfile();
    });
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "index.html";
    });
  }
});

// ==============================
// 👤 Load User Profile
// ==============================
async function loadUserProfile() {
  try {
    const userRef = doc(db, "users", currentUser.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();
      const address = data.address || {};

      document.getElementById("first-name").value = data.firstName || "";
      document.getElementById("last-name").value = data.lastName || "";
      document.getElementById("house-number").value = address.houseNumber || "";
      document.getElementById("street").value = address.street || "";
      document.getElementById("city").value = address.city || "";
      document.getElementById("county").value = address.county || "";
      document.getElementById("postcode").value = address.postcode || "";
    } else {
      console.warn("User profile does not exist.");
    }
  } catch (err) {
    console.error("Failed to load user profile:", err);
  }
}

// ==============================
// 💾 Save User Profile
// ==============================
async function saveUserProfile() {
  try {
    const userRef = doc(db, "users", currentUser.uid);
    await setDoc(userRef, {
      firstName: document.getElementById("first-name").value,
      lastName: document.getElementById("last-name").value,
      address: {
        houseNumber: document.getElementById("house-number").value,
        street: document.getElementById("street").value,
        city: document.getElementById("city").value,
        county: document.getElementById("county").value,
        postcode: document.getElementById("postcode").value
      }
    }, { merge: true });

    alert("Profile saved!");
  } catch (err) {
    console.error("Failed to save profile:", err);
    alert("Failed to save profile.");
  }
}

// ==============================
// 📦 Load User Orders
// ==============================
async function loadUserOrders() {
  try {
    const ordersRef = collection(db, "Orders");
    const q = query(ordersRef, where("userId", "==", currentUser.uid));
    const snap = await getDocs(q);

    const ordersContainer = document.querySelector(".form-container:nth-of-type(2)");
    if (!ordersContainer) return;

    // Remove loading message
    ordersContainer.querySelector("p")?.remove();

    if (snap.empty) {
      ordersContainer.innerHTML += `<p>You haven't placed any orders yet.</p>`;
      return;
    }

    let html = "";
    snap.forEach(doc => {
      const order = doc.data();
      html += `
        <div class="order-card">
          <p><strong>Status:</strong> ${order.status}</p>
          <p><strong>Date:</strong> ${new Date(order.createdAt?.seconds * 1000).toLocaleString()}</p>
          <ul>
            ${order.items.map(item => `
              <li>${item.productName} × ${item.qty} — £${(item.price * item.qty).toFixed(2)}</li>
            `).join("")}
          </ul>
        </div>
        <hr/>
      `;
    });

    ordersContainer.innerHTML += html;
  } catch (err) {
    console.error("Failed to load orders:", err);
  }
}
