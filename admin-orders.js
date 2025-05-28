import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { db } from './firebase.js';

async function loadOrders() {
  const ordersRef = collection(db, "Orders");
  const snapshot = await getDocs(ordersRef);
  const container = document.getElementById("orderList");
  container.innerHTML = ""; // clear loading message

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const orderId = docSnap.id;

    const items = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.Items)
        ? data.Items
        : [];

    const orderCard = document.createElement("div");
    orderCard.className = "order-card";

    const itemHTML = items.map(item => `
      <li>${item.productName} × ${item.qty} — £${(item.price * item.qty).toFixed(2)}</li>
    `).join("");

    orderCard.innerHTML = `
      <button class="collapsible"><strong>${data.name}</strong> &lt;${data.email}&gt;</button>
      <div class="content">
        <p><strong>Address:</strong><br>${data.address || 'No address'}</p>
        <p><strong>Status:</strong> 
          <select class="status-dropdown" data-id="${orderId}">
            <option value="pending" ${data.status === "pending" ? "selected" : ""}>pending</option>
            <option value="in progress" ${data.status === "in progress" ? "selected" : ""}>in progress</option>
            <option value="dispatched" ${data.status === "dispatched" ? "selected" : ""}>dispatched</option>
          </select>
        </p>
        <ul>${itemHTML}</ul>
      </div>
    `;

    container.appendChild(orderCard);
  });

  // Toggle collapsible content
  document.querySelectorAll(".collapsible").forEach(btn => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      content.style.display = content.style.display === "block" ? "none" : "block";
    });
  });

  // Handle status changes
  document.querySelectorAll(".status-dropdown").forEach(dropdown => {
    dropdown.addEventListener("change", async (e) => {
      const orderId = e.target.dataset.id;
      const newStatus = e.target.value;

      try {
        const orderRef = doc(db, "Orders", orderId);
        await updateDoc(orderRef, { status: newStatus });
        alert(`Order ${orderId} updated to "${newStatus}"`);
      } catch (err) {
        console.error("Failed to update order status:", err);
        alert("Error updating order. Please try again.");
      }
    });
  });
}

loadOrders();
