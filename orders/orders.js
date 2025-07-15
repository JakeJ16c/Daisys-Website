import { auth, db } from '/firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { collection, getDocs, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// Global variables for pagination
let orders = [];
let currentPage = 1;
const ordersPerPage = 6;

// When DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  const ordersGrid = document.getElementById("ordersGrid");
  if (!ordersGrid) return console.error("❌ Missing #ordersGrid container");

  // Auth check
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      ordersGrid.innerHTML = "<p>You must be logged in to view your orders.</p>";
      return;
    }

    try {
      // Fetch orders and product images
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
        ordersGrid.innerHTML = "<p>You haven't placed any orders yet.</p>";
        return;
      }

      // Build order card HTMLs
      orders = []; // reset
      snapshot.forEach(orderDoc => {
        const order = orderDoc.data();
        const orderId = orderDoc.id;
        const orderStatus = order.status || "Confirmed";

        const thumbnails = (order.items || [])
          .slice(0, 4)
          .map(item => {
            const img = productMap[item.productName?.trim().toLowerCase()] || 'favicon_circle.ico';
            return `<img src="${img}" class="product-thumb" alt="${item.productName}">`;
          }).join("");

        const html = `
          <div class="order-card" onclick="window.location.href='orders/order.html?id=${orderId}'">
            <div class="order-images-wrapper">${thumbnails}</div>
            <div class="order-status-bar">
              ${orderStatus}
            </div>
            <div class="order-summary-text">
                <p>${order.items?.length || 0} ${order.items?.length === 1 ? 'item' : 'items'}</p>
                <p>Order #${order.orderNumber || "N/A"}</p>
                <p>£${parseFloat(order.finalTotal || 0).toFixed(2)}</p>
              </div>
              <button class="review-btn leave-review-btn" data-order-id="${orderId}" onclick="event.stopPropagation();">
                Leave a Review
              </button>
            </div>
        `;

        orders.push({ ...order, html });
      });

      // Initial render
      renderPage(currentPage);

    } catch (err) {
      console.error("🔥 Failed to fetch orders:", err);
      ordersGrid.innerHTML = "<p>Sorry, there was a problem loading your orders.</p>";
    }
  });
});

// Render orders for a specific page
function renderPage(page) {
  const ordersGrid = document.getElementById("ordersGrid");
  ordersGrid.innerHTML = "";

  const start = (page - 1) * ordersPerPage;
  const end = start + ordersPerPage;
  const paginatedOrders = orders.slice(start, end);

  paginatedOrders.forEach(order => {
    ordersGrid.innerHTML += order.html;
  });

  attachReviewListeners();
  renderPaginationControls();
}

// Create pagination buttons
function renderPaginationControls() {
  const pagination = document.getElementById("pagination");
  if (!pagination) return;

  const totalPages = Math.ceil(orders.length / ordersPerPage);
  pagination.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active-page");
    btn.onclick = () => {
      currentPage = i;
      renderPage(currentPage);
    };
    pagination.appendChild(btn);
  }
}

function attachReviewListeners() {
  const modal = document.getElementById('product-picker-modal');
  const productOptionsContainer = document.getElementById('product-options');

  document.querySelectorAll('.leave-review-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const orderId = btn.dataset.orderId;
      const orderSnap = await getDoc(doc(db, "Orders", orderId));
      if (!orderSnap.exists()) return;

      const orderData = orderSnap.data();
      const products = orderData.items || [];

      productOptionsContainer.innerHTML = '';

      for (const product of products) {
        const productRef = doc(db, "Products", product.productId);
        const productSnap = await getDoc(productRef);

        const productData = productSnap.exists() ? productSnap.data() : {};
        const productName = productData.name || "Unnamed Product";
        const productImage = Array.isArray(productData.images) && productData.images.length > 0
          ? productData.images[0]
          : "favicon_circle.ico";

        const div = document.createElement('div');
        div.classList.add('product-option');
        div.innerHTML = `
          <img src="${productImage}" alt="${productName}">
          <div>
            <p><strong>${productName}</strong></p>
            <p>Size: ${product.size || 'N/A'}</p>
          </div>
        `;

        div.addEventListener('click', () => {
          const params = new URLSearchParams({
            productId: product.productId,
            orderId
          });
          window.location.href = `/review/?${params.toString()}`;
        });

        productOptionsContainer.appendChild(div);
      }

      // ✅ Show modal AFTER products are rendered
      modal.classList.remove('hidden');
    });
  });

  // ✅ Close modal
  document.querySelector('.close-modal').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
}
