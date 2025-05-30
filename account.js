// =========================
// ✅ Firebase Imports First
// =========================
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

// =========================
// 🔐 Global Variables
// =========================
let currentUser = null;

// =========================
// 👤 Load User Profile
// =========================
async function loadUserProfile() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.warn("User not logged in.");
        return resolve();
      }

      currentUser = user;

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();

          document.getElementById("first-name").value = data.firstName || "";
          document.getElementById("last-name").value = data.lastName || "";
          document.getElementById("house-number").value =
            data.address?.houseNumber || "";
          document.getElementById("street").value =
            data.address?.street || "";
          document.getElementById("city").value = data.address?.city || "";
          document.getElementById("county").value = data.address?.county || "";
          document.getElementById("postcode").value =
            data.address?.postcode || "";
        } else {
          console.warn("User document not found in Firestore.");
        }

        resolve();
      } catch (error) {
        console.error("Failed to load user profile", error);
        reject(error);
      }
    });
  });
}

// =========================
// 💾 Save User Profile
// =========================
async function saveUserProfile() {
  if (!currentUser) {
    console.warn("No user is currently logged in.");
    alert("You must be logged in to save your profile.");
    return;
  }

  const userRef = doc(db, "users", currentUser.uid);

  const userData = {
    firstName: document.getElementById("first-name").value.trim(),
    lastName: document.getElementById("last-name").value.trim(),
    address: {
      houseNumber: document.getElementById("house-number").value.trim(),
      street: document.getElementById("street").value.trim(),
      city: document.getElementById("city").value.trim(),
      county: document.getElementById("county").value.trim(),
      postcode: document.getElementById("postcode").value.trim(),
    },
    email: currentUser.email,
  };

  console.log("Saving user profile to Firestore:", userData);

  try {
    await setDoc(userRef, userData, { merge: true });
    alert("Profile saved successfully!");
  } catch (error) {
    console.error("Error saving profile to Firestore:", error);
    alert("Failed to save profile. Please try again.");
  }
}

// =========================
// 📦 Load User Orders
// =========================
async function loadUserOrders() {
  const ordersDiv = document.querySelectorAll(".form-container:not(:first-of-type)")[0];
  const statusPara = ordersDiv.querySelector("p");

  if (!currentUser) {
    statusPara.textContent = "You need to be logged in to view orders.";
    return;
  }

  try {
    const ordersRef = collection(db, "Orders");
    const q = query(ordersRef, where("userId", "==", currentUser.uid));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      statusPara.textContent = "You haven't placed any orders yet.";
      return;
    }

    statusPara.remove(); // Remove "Loading..." or placeholder

    querySnapshot.forEach((docSnap) => {
      const order = docSnap.data();

      const orderEl = document.createElement("div");
      orderEl.className = "order-entry";
      orderEl.innerHTML = `
        <p><strong>Status:</strong> ${order.status || "pending"}</p>
        <p><strong>Date:</strong> ${order.createdAt?.toDate().toLocaleString() || "Unknown"}</p>
        <ul>
          ${order.items
            .map(
              (item) =>
                `<li>${item.productName} × ${item.qty} – £${(item.price * item.qty).toFixed(2)}</li>`
            )
            .join("")}
        </ul>
      `;

      ordersDiv.appendChild(orderEl);
    });
  } catch (err) {
    console.error("Error loading orders:", err);
    statusPara.textContent = "Failed to load your orders.";
  }
}

// =========================
// 🚪 Setup Logout
// =========================
function setupLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        window.location.href = "index.html";
      } catch (err) {
        console.error("Logout failed", err);
      }
    });
  }
}

// =========================
// 🚀 Init Everything
// =========================
async function init() {
  await loadUserProfile();
  await loadUserOrders();

  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      saveUserProfile();
    });
  }

  setupLogout();
}
