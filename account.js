import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where, } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { auth, db } from "./firebase.js";

let currentUser = null;

// =========================
// 👤 Load User Profile from Firestore
// =========================
async function loadUserProfile() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) return resolve(); // not logged in

      currentUser = user;

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          const addr = data.address || {};

          // ✅ Fill editable form fields
          document.getElementById("first-name").value = data.firstName || "";
          document.getElementById("last-name").value = data.lastName || "";
          document.getElementById("house-number").value = addr.houseNumber || "";
          document.getElementById("street").value = addr.street || "";
          document.getElementById("city").value = addr.city || "";
          document.getElementById("county").value = addr.county || "";
          document.getElementById("postcode").value = addr.postcode || "";

          // ✅ Update the view mode display
          updateViewMode(data);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      }

      resolve();
    });
  });
}

// =========================
// 🪪 Update view-only display section
// =========================
function updateViewMode(data) {
  const nameText = `${data.firstName || ""} ${data.lastName || ""}`.trim();
  const address = data.address || {};
  const addressParts = [
    address.houseNumber,
    address.street,
    address.city,
    address.county,
    address.postcode
  ].filter(Boolean).join(", ");

  document.getElementById("view-name").textContent = nameText || "Not provided";
  document.getElementById("view-address").textContent = addressParts || "No address on file";
}

// =========================
// 🖊️ Toggle between edit and view mode
// =========================
window.toggleEdit = function (toEdit) {
  document.getElementById("account-edit").style.display = toEdit ? "block" : "none";
  document.getElementById("account-view").style.display = toEdit ? "none" : "block";
};

// =========================
// 💾 Save Profile Info to Firestore
// =========================
async function saveProfile(e) {
  e.preventDefault();

  if (!currentUser) return alert("You must be logged in to save your profile.");

  const firstName = document.getElementById("first-name").value.trim();
  const lastName = document.getElementById("last-name").value.trim();
  const address = {
    houseNumber: document.getElementById("house-number").value.trim(),
    street: document.getElementById("street").value.trim(),
    city: document.getElementById("city").value.trim(),
    county: document.getElementById("county").value.trim(),
    postcode: document.getElementById("postcode").value.trim(),
  };

  try {
    // ✅ Save user profile
    await setDoc(doc(db, "users", currentUser.uid), {
      firstName,
      lastName,
      address,
    });

    alert("Profile updated successfully!");

    // ✅ Refresh view display
    updateViewMode({ firstName, lastName, address });
    toggleEdit(false); // Hide form after saving
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
                ? order.items.map(item => {
                    return `<li>${item.productName} × ${item.qty} – £${item.price.toFixed(2)}</li>`;
                  }).join("")
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

  if (currentUser) {
    loadUserOrders(currentUser);
  }

  setupLogout();
});
