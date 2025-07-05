// orders.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const wrapper = document.getElementById("orders-wrapper");
  if (!wrapper) return console.error("❌ Missing #orders-wrapper");

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      wrapper.innerHTML = "<p>You must be logged in to view your orders.</p>";
      return;
    }

    const ordersRef = collection(db, "Orders");
    const q = query(ordersRef, where("userId", "==", user.uid));
    const snapshot = await getDocs(q);

    const productSnapshot = await getDocs(collection(db, "Products"));
    const productMap = {};
    productSnapshot.forEach(doc => {
      const data = doc.data();
      const key = data.name?.trim().toLowerCase();
      const img = Array.isArray(data.images) && data.images.length > 0
        ? data.images[0]
        : "favicon_circle.ico";
      if (key) productMap[key] = img;
    });

    if (snapshot.empty) {
      wrapper.innerHTML = "<p>You haven't placed any orders yet.</p>";
      return;
    }

    snapshot.forEach(orderDoc => {
      const order = orderDoc.data();
      const orderId = orderDoc.id;
      const orderDate = order.createdAt?.toDate?.().toLocaleString() || "Unknown";
      const orderStatus = order.status || "Confirmed";

      const thumbnails = (order.items || [])
        .slice(0, 4)
        .map(item => {
          const img = productMap[item.productName?.trim().toLowerCase()] || 'favicon_circle.ico';
          return `<img src="${img}" class="product-thumb" alt="${item.productName}">`;
        }).join("");

      wrapper.innerHTML += `
          <div class="order-card" onclick="window.location.href='order-details.html?id=${orderId}'">
            <div class="order-images-wrapper">
              ${thumbnails}
            </div>
            <div class="order-status-bar">
              <span class="order-status-pill">${orderStatus}</span>
            </div>
            <div class="order-summary-text">
              <p><strong>${order.items?.length || 0}</strong> item(s)</p>
              <p><strong>Order #</strong> ${order.orderNumber || "N/A"}</p>
              <p>£${order.total?.toFixed(2) || "0.00"}</p>
            </div>
          </div>
        `;
    });
  });
});
