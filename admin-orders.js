import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

import { db, messaging } from './firebase.js';
import { getToken } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging.js";

function formatDate(timestamp) {
  const date = timestamp.toDate();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${day}/${month}/${year} @ ${hours}:${minutes} ${ampm}`;
}

// ✅ STEP 1: Ask for notification permission and get FCM token
async function setupPushNotifications() {
  try {
    // ✅ Correct relative path to match GitHub Pages subfolder deployment
    const registration = await navigator.serviceWorker.register('./firebase-messaging-sw.js');

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: "BKWmwmuEDejKmOZEFLtWAgZXD2OUPqS_77NA6hTEf9-9SXDG9fJh0EZDG7qExr8IDrRiHVPSNvbXohUKsV12ueA",
        serviceWorkerRegistration: registration  // ✅ Tell Firebase to use your SW
      });

      console.log("✅ FCM Token retrieved:", token);
      await setDoc(doc(db, "adminTokens", "admin"), { token });
      console.log("📦 Token saved to Firestore");

      // await setDoc(doc(db, "adminTokens", "admin"), { token }); // optional
    } else {
      console.warn("❌ Notification permission denied");
    }
  } catch (err) {
    console.error("❌ Failed to get FCM token or register service worker:", err);
  }
}


// ✅ STEP 2: Load existing orders from Firestore
async function loadOrders() {
  const ordersRef = collection(db, "Orders");
  const snapshot = await getDocs(ordersRef);
  const container = document.getElementById("orderList");
  container.innerHTML = "";

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const orderId = docSnap.id;

    const items = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.Items)
        ? data.Items
        : [];

    const subtotal = items.reduce((acc, item) => {
      return acc + (parseFloat(item.price || 0) * parseFloat(item.qty || 0));
    }, 0);

    const createdAt = data.createdAt?.toDate
      ? formatDate(data.createdAt)
      : "Unknown";

    const orderCard = document.createElement("div");
    orderCard.className = "order-card";

    const itemHTML = items.map(item => `
      <li>${item.productName} × ${item.qty} — £${(item.price * item.qty).toFixed(2)}</li>
    `).join("");

    orderCard.innerHTML = `
      <button class="collapsible">
        <div class="overview-row">
          <span class="overview-name">${data.name}</span>
          <span class="overview-status">${data.status || 'unknown'}</span>
        </div>
      </button>
      <div class="content">
        <p><strong>Email:</strong> ${data.email || "no@email.com"}</p>
        <p><strong>Address:</strong><br>${
  typeof data.address === "object"
    ? `
      ${data.address.houseNumber ? `<div><strong>House Number:</strong> ${data.address.houseNumber}</div>` : ""}
      ${data.address.street ? `<div><strong>Street:</strong> ${data.address.street}</div>` : ""}
      ${data.address.city ? `<div><strong>City:</strong> ${data.address.city}</div>` : ""}
      ${data.address.county ? `<div><strong>County:</strong> ${data.address.county}</div>` : ""}
      ${data.address.postcode ? `<div><strong>Postcode:</strong> ${data.address.postcode}</div>` : ""}
    `.trim()
    : `<div>${data.address || 'No address provided'}</div>`
}</p>
        <p><strong>Status:</strong> 
          <select class="status-dropdown" data-id="${orderId}">
            <option value="pending" ${data.status === "pending" ? "selected" : ""}>pending</option>
            <option value="in progress" ${data.status === "in progress" ? "selected" : ""}>in progress</option>
            <option value="dispatched" ${data.status === "dispatched" ? "selected" : ""}>dispatched</option>
          </select>
        </p>
        <ul>${itemHTML}</ul>
        <p><strong>Subtotal:</strong> £${subtotal.toFixed(2)}</p>
        <p><strong>Placed:</strong> ${createdAt}</p>
      </div>
    `;

    container.appendChild(orderCard);
  });

  // Expand/collapse sections
  document.querySelectorAll(".collapsible").forEach(btn => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      content.style.display = content.style.display === "block" ? "none" : "block";
    });
  });

  // Handle status change
  document.querySelectorAll(".status-dropdown").forEach(dropdown => {
    dropdown.addEventListener("change", async (e) => {
      const orderId = e.target.dataset.id;
      const newStatus = e.target.value;

      try {
        const orderRef = doc(db, "Orders", orderId);
        await updateDoc(orderRef, { status: newStatus });
        alert(`Order updated to "${newStatus}"`);

        const header = e.target.closest('.content').previousElementSibling;
        header.querySelector('.overview-status').textContent = newStatus;
      } catch (err) {
        console.error("Failed to update status:", err);
        alert("Failed to update order status.");
      }
    });
  });
}

// ✅ STEP 3: Run everything
setupPushNotifications();
loadOrders();
