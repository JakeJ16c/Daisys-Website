import { getAuth, onAuthStateChanged, signOut, } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where, } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
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
// Lookup Address
// =========================
const apiKey = "E5XUL7BVtEieVDcUjtuFsw46674";
const postcodeInput = document.getElementById("postcode-search");
const resultsDropdown = document.getElementById("address-results");

// Debounce typing
let debounceTimeout;
postcodeInput.addEventListener("input", () => {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    console.log("🔍 Triggering lookup for:", postcodeInput.value.trim());
    fetchPostcodeSuggestions();
  }, 400);
});

async function fetchPostcodeSuggestions() {
  const term = postcodeInput.value.trim();
  if (term.length < 5) {
    resultsDropdown.innerHTML = "";
    return;
  }

  try {
    const res = await fetch(`https://api.getAddress.io/find/${encodeURIComponent(term)}?api-key=${apiKey}`);
    const data = await res.json();
    console.log("📦 Find API response:", data);

    if (!data || !Array.isArray(data.addresses) || data.addresses.length === 0) {
      resultsDropdown.innerHTML = "<div class='address-option'>No results found</div>";
      return;
    }

    resultsDropdown.innerHTML = data.addresses
      .map(address => `<div class="address-option">${address}</div>`)
      .join("");

    document.querySelectorAll(".address-option").forEach(option => {
      option.addEventListener("click", () => {
        fillAddressFromLine(option.textContent);
        resultsDropdown.innerHTML = "";
      });
    });
  } catch (err) {
    console.error("❌ Postcode find failed", err);
    resultsDropdown.innerHTML = "<div class='address-option'>Error fetching results</div>";
  }
}

function fillAddressFromLine(addressLine) {
  // Simple split — assumes format: house number, street, city, county
  const parts = addressLine.split(",").map(p => p.trim());

  // Flexible fallback if any field is missing
  document.getElementById("house-number").value = parts[0] || "";
  document.getElementById("street").value = parts[1] || "";
  document.getElementById("city").value = parts[2] || "";
  document.getElementById("county").value = parts[3] || "";
}

async function fetchFullAddress(id) {
  try {
    const res = await fetch(`https://api.getAddress.io/get/${id}?api-key=${apiKey}`);
    const data = await res.json();
    const addr = data.address;

    document.getElementById("house-number").value = addr.building_number || addr.building_name || "";
    document.getElementById("street").value = addr.line_1 || "";
    document.getElementById("city").value = addr.town_or_city || "";
    document.getElementById("county").value = addr.county || "";
    document.getElementById("postcode").value = addr.postcode || "";
  } catch (err) {
    console.error("Address fetch failed:", err);
  }
}

// =========================
// 📦 Load User Orders
// =========================
async function loadUserOrders(user) {
  const ordersRef = collection(db, "Orders");
  const q = query(ordersRef, where("userId", "==", user.uid));
  const snapshot = await getDocs(q);
  const productSnapshot = await getDocs(collection(db, "Products"));
  const productMap = {};
  productSnapshot.forEach(doc => {
    const data = doc.data();
    const nameKey = data.name?.trim().toLowerCase();
    const img = Array.isArray(data.images) && data.images.length > 0
      ? data.images[0]
      : "https://via.placeholder.com/40";
  
    if (nameKey) productMap[nameKey] = img;
  });

  const orders = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));

  // Store in chunks
  const ordersPerPage = 6;
  let currentPage = 1;
  const totalPages = Math.ceil(orders.length / ordersPerPage);

  function renderPage(page) {
    const wrapper = document.getElementById("orders-wrapper");
    const pagination = document.getElementById("pagination-controls");
    wrapper.innerHTML = "";

    const start = (page - 1) * ordersPerPage;
    const end = start + ordersPerPage;
    const pageOrders = orders.slice(start, end);

    if (pageOrders.length === 0) {
      wrapper.innerHTML = "<p>You haven't placed any orders yet.</p>";
      return;
    }

    pageOrders.forEach(order => {
      const date = order.createdAt?.toDate?.().toLocaleString() || "Unknown date";
      const itemsList = Array.isArray(order.items)
        ? order.items.map(item => `<li>${item.productName} × ${item.qty} – £${item.price.toFixed(2)}</li>`).join("")
        : "<li>No items found in this order.</li>";

      wrapper.innerHTML += `
        <div class="order-card">
          <div class="order-summary" onclick="this.classList.toggle('open'); this.nextElementSibling.classList.toggle('open')">
            <div class="summary-left">
              <strong>Order No.${order.orderNumber || "N/A"}</strong>
            </div>
            <div class="summary-right">
              <div class="order-images">
                ${Array.isArray(order.items)
                  ? order.items.slice(0, 5).map(item => `
                      <img src="${productMap[item.productName?.trim().toLowerCase()] || 'favicon_circle.ico'}" class="product-thumb" />
                    `).join('')
                  : ''
                }
              </div>
              <i class="fa fa-chevron-down"></i>
            </div>
          </div>
          <div class="order-details">
            <p class="order-date">Placed on: ${date}</p>
            <ul>${itemsList}</ul>

            <div class="status-timeline">
              ${["Confirmed", "Ready to Ship", "Dispatched", "Delivered"].map((stage, index, arr) => {
                const currentIndex = arr.indexOf(order.status || "Confirmed");
                const isCompleted = index < currentIndex;
                const isActive = index === currentIndex;
            
                return `
                  <div class="status-step ${isCompleted ? "completed" : isActive ? "active" : ""}">${stage}</div>
                  ${index < arr.length - 1 ? '<div class="status-line"></div>' : ""}
                `;
              }).join("")}
            </div>

          </div>
        </div>
      `;
    });

    // Pagination buttons
    pagination.innerHTML = "";
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.style.margin = "0 5px";
      btn.style.padding = "6px 10px";
      btn.style.borderRadius = "6px";
      btn.style.border = "1px solid #ccc";
      btn.style.backgroundColor = i === page ? "#204ECF" : "#f0f0f0";
      btn.style.color = i === page ? "#fff" : "#000";
      btn.addEventListener("click", () => {
        currentPage = i;
        renderPage(currentPage);
      });
      pagination.appendChild(btn);
    }
  }

  renderPage(currentPage);
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
