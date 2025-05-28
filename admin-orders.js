import {
  collection,
  getDocs,
  doc,
  updateDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

import { db } from './firebase.js';

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
      ? data.createdAt.toDate().toLocaleString()
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
        <p><strong>Address:</strong><br>${data.address || 'No address provided'}</p>
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

        // Update collapsed summary
        const header = e.target.closest('.content').previousElementSibling;
        header.querySelector('.overview-status').textContent = newStatus;
      } catch (err) {
        console.error("Failed to update status:", err);
        alert("Failed to update order status.");
      }
    });
  });
}

loadOrders();
