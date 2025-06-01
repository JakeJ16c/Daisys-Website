import {
  collection,
  doc,
  updateDoc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

import { db, messaging } from '../firebase.js';
import { getToken } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging.js";

// ✅ Format Firestore timestamp
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

// ✅ Get FCM token and store to Firestore
async function setupPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.register('./sw.js');

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: "BKWmwmuEDejKmOZEFLtWAgZXD2OUPqS_77NA6hTEf9-9SXDG9fJh0EZDG7qExr8IDrRiHVPSNvbXohUKsV12ueA",
        serviceWorkerRegistration: registration
      });

      console.log("✅ FCM Token:", token);
      await setDoc(doc(db, "adminTokens", "admin"), { token });
      console.log("📦 Token saved");
    } else {
      console.warn("❌ Notification permission denied");
    }
  } catch (err) {
    console.error("❌ FCM Setup Error:", err);
  }
}

// ✅ Load & watch orders in real-time
function loadOrdersLive() {
  const ordersRef = collection(db, "Orders");
  const container = document.getElementById("orderList");

  onSnapshot(ordersRef, (snapshot) => {
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = "<p>No orders found.</p>";
      return;
    }

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
  <div style="
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    background-color: #f6f6f6;
    margin-bottom: 20px;
  ">
    <div style="
      background-color: #eeeeee;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      font-size: 1rem;
      color: #333;
    ">
      ${data.name || 'Unnamed'}
      <span style="
        font-size: 0.85rem;
        padding: 4px 10px;
        border-radius: 15px;
        background-color: ${
          data.status === 'pending' ? '#fff3cd' :
          data.status === 'in progress' ? '#cce5ff' :
          data.status === 'dispatched' ? '#d4edda' :
          '#eee'
        };
        color: ${
          data.status === 'pending' ? '#856404' :
          data.status === 'in progress' ? '#004085' :
          data.status === 'dispatched' ? '#155724' :
          '#555'
        };
      ">${data.status || 'pending'}</span>
    </div>
    <div style="background-color: #fff; padding: 20px; font-size: 0.95rem;">
      <p><strong>Email:</strong> ${data.email || "no@email.com"}</p>
      <p><strong>Address:</strong><br>${
        typeof data.address === "object"
          ? `
            ${data.address.houseNumber ? `<strong>House Number:</strong> ${data.address.houseNumber}<br>` : ""}
            ${data.address.street ? `<strong>Street:</strong> ${data.address.street}<br>` : ""}
            ${data.address.city ? `<strong>City:</strong> ${data.address.city}<br>` : ""}
            ${data.address.county ? `<strong>County:</strong> ${data.address.county}<br>` : ""}
            ${data.address.postcode ? `<strong>Postcode:</strong> ${data.address.postcode}` : ""}
          `.trim()
          : `${data.address || 'No address provided'}`
      }</p>
      <p><strong>Status:</strong> 
        <select class="status-dropdown" data-id="${orderId}" style="
          margin-top: 5px;
          padding: 6px 10px;
          border: 1px solid #ccc;
          border-radius: 5px;
          font-size: 0.9rem;
        ">
          <option value="pending" ${data.status === "pending" ? "selected" : ""}>pending</option>
          <option value="in progress" ${data.status === "in progress" ? "selected" : ""}>in progress</option>
          <option value="dispatched" ${data.status === "dispatched" ? "selected" : ""}>dispatched</option>
        </select>
      </p>
      <ul style="margin: 15px 0; padding: 0; list-style: none;">
        ${items.map(item => `
          <li style="background: #f8f8f8; padding: 10px; margin-bottom: 5px; border-radius: 5px;">
            ${item.productName} × ${item.qty} — £${(item.price * item.qty).toFixed(2)}
          </li>
        `).join("")}
      </ul>
      <p><strong>Subtotal:</strong> £${subtotal.toFixed(2)}</p>
      <p><strong>Placed:</strong> ${createdAt}</p>
    </div>
  </div>
`;

      container.appendChild(orderCard);
    });

    enableUIHandlers();
  });
}

// ✅ Setup dropdown logic and collapsible toggles
function enableUIHandlers() {
  document.querySelectorAll(".collapsible").forEach(btn => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      content.style.display = content.style.display === "block" ? "none" : "block";
    });
  });

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

// ✅ Init
setupPushNotifications();
loadOrdersLive();
