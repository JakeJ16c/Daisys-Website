// orders/orders.js
import { auth, db } from '../firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const ordersWrapper = document.getElementById("orders-wrapper");

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const ordersRef = collection(db, "Orders");
  const q = query(ordersRef, where("userId", "==", user.uid));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    ordersWrapper.innerHTML = "<p>You haven't placed any orders yet.</p>";
    return;
  }

  const productSnapshot = await getDocs(collection(db, "Products"));
  const productMap = {};
  productSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.name && data.images && data.images.length > 0) {
      productMap[data.name.trim().toLowerCase()] = data.images[0];
    }
  });

  snapshot.forEach(orderDoc => {
    const order = orderDoc.data();
    const orderDate = order.createdAt?.toDate().toLocaleDateString() || "Unknown";
    const orderId = orderDoc.id;
    const productImgs = (order.items || []).map(item =>
      `<img src="\${productMap[item.productName?.trim().toLowerCase()] || 'favicon_circle.ico'}" class="order-product-img" alt="\${item.productName}" />`
    ).join("");

    const cardHTML = `
      <div class="order-card" onclick="window.location.href='order-details.html?id=\${orderId}'">
        <div class="order-status-line">
          <span class="order-status-icon">📦</span>
          <span class="order-status-text">\${order.status || "Confirmed"}</span>
          <span class="order-date">\${orderDate}</span>
        </div>
        <div class="order-images-grid">
          \${productImgs}
        </div>
        <div class="order-summary-text">
          <p>\${order.items?.length || 0} item(s)</p>
          <p>Order No. \${order.orderNumber || "N/A"}</p>
          <p>Total: £\${order.total?.toFixed(2) || "0.00"}</p>
        </div>
      </div>
    `;

    ordersWrapper.innerHTML += cardHTML;
  });
});
