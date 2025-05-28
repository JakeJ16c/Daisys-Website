import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { db } from './firebase.js';

async function loadOrders() {
  const ordersRef = collection(db, "Orders");
  const snapshot  = await getDocs(ordersRef);
  const container = document.getElementById("orderList");
  container.innerHTML = ""; // clear “Loading…”

  snapshot.forEach(docSnap => {
    const data = docSnap.data();

    // pick the array, whether it's items or Items
    const items = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.Items)
        ? data.Items
        : [];

    // build the card
    const orderCard = document.createElement("div");
    orderCard.className = "order-card";
    orderCard.innerHTML = `
      <h3>${data.name} &lt;${data.email}&gt;</h3>
      <p>Status: <strong>${data.Status}</strong></p>
      <ul>
        ${items.map(item => `
          <li>${item.productName} × ${item.qty} — £${(item.price * item.qty).toFixed(2)}</li>
        `).join("")}
      </ul>
    `;

    container.appendChild(orderCard);
  });
}

loadOrders();
