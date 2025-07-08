import { auth, db } from './firebase.js';
import {
  doc, getDoc, getDocs, collection
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

// 🔓 Entry Point – use mode "cart" or "direct"
export async function initCheckout({ mode = "cart", product = null } = {}) {
  const existing = document.getElementById("checkout");
  if (existing) existing.remove();

  // Inject DOM container
  const wrapper = document.createElement("div");
  wrapper.id = "checkout";
  wrapper.innerHTML = `
    <div class="checkout-panel">
      <button id="closeCheckout">&times;</button>
      <div class="checkout-content">
        <h2>Secure Checkout</h2>
        <div id="checkout-body">
          <p class="loading-text">Loading...</p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);

  // Scroll lock + close logic
  document.body.style.overflow = "hidden";
  document.getElementById("closeCheckout").onclick = () => {
    document.getElementById("checkout")?.remove();
    document.body.style.overflow = "";
  };

  // Choose mode: "cart" vs "direct"
  if (mode === "direct") {
    renderProductCheckout(product);
  } else {
    const user = await waitForUser();
    if (!user) {
      document.getElementById("checkout-body").innerHTML = `<p>Please sign in to view your basket.</p>`;
      return;
    }

    const cart = await loadCartFromFirestore(user.uid);
    renderCartCheckout(cart, user.uid);
  }

  injectBaseStyles();
}

// 🔐 Wait for Firebase Auth to resolve
function waitForUser() {
  return new Promise(resolve => {
    onAuthStateChanged(auth, user => resolve(user));
  });
}

// 📦 Load Firestore basket items
async function loadCartFromFirestore(uid) {
  try {
    const snap = await getDocs(collection(db, "users", uid, "Basket"));
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (err) {
    console.error("❌ Firestore cart load failed:", err);
    return [];
  }
}

// 🧍 Render direct product checkout
function renderProductCheckout(product) {
  const container = document.getElementById("checkout-body");
  if (!product) {
    container.innerHTML = `<p>Missing product data.</p>`;
    return;
  }

  const total = product.price * product.qty;

  container.innerHTML = `
    <div class="checkout-item">
      <div class="item-img"><img src="${product.image}" alt="${product.name}"></div>
      <div class="item-details">
        <div class="item-name">${product.name}</div>
        ${product.size && product.size.toLowerCase() !== "onesize" ? `<div class="item-size">Size: ${product.size}</div>` : ""}
        <div class="item-qty-price">Qty: ${product.qty} × £${product.price.toFixed(2)} = <strong>£${total.toFixed(2)}</strong></div>
      </div>
    </div>
    <hr>
    <p class="summary-line">Total: <strong>£${total.toFixed(2)}</strong></p>

    <div class="checkout-section">
      <h3>Customer Details</h3>
      <p id="customer-info">Loading user info...</p>
    </div>

    <div class="checkout-section">
      <h3>Delivery Address</h3>
      <p id="address-info">No address selected.</p>
      <button id="addAddressBtn" class="secondary-btn">Add Address</button>
    </div>

    <div style="margin-top: 2rem; text-align: right;">
      <button id="completePaymentBtn" class="primary-btn">Complete Payment</button>
    </div>
  `;

  populateCustomerInfo();
}

// 🧺 Render full cart checkout
function renderCartCheckout(cart, uid) {
  const container = document.getElementById("checkout-body");
  container.innerHTML = "";

  if (!cart.length) {
    container.innerHTML = `<p>Your basket is empty.</p>`;
    return;
  }

  let subtotal = 0;
  cart.forEach(item => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "checkout-item";
    const total = item.qty * item.price;
    subtotal += total;

    itemDiv.innerHTML = `
      <div class="item-img"><img src="${item.image}" alt="${item.name}"></div>
      <div class="item-details">
        <div class="item-name">${item.name}</div>
        ${item.size && item.size.toLowerCase() !== "onesize" ? `<div class="item-size">Size: ${item.size}</div>` : ""}
        <div class="item-qty-price">Qty: ${item.qty} × £${item.price.toFixed(2)} = <strong>£${total.toFixed(2)}</strong></div>
      </div>
    `;
    container.appendChild(itemDiv);
  });

  const summary = document.createElement("div");
  summary.className = "checkout-summary";
  summary.innerHTML = `
    <hr>
    <p class="summary-line">Subtotal: <strong>£${subtotal.toFixed(2)}</strong></p>

    <div class="checkout-section">
      <h3>Customer Details</h3>
      <p id="customer-info">Loading user info...</p>
    </div>

    <div class="checkout-section">
      <h3>Delivery Address</h3>
      <p id="address-info">No address selected.</p>
      <button id="addAddressBtn" class="secondary-btn">Add Address</button>
    </div>

    <div style="margin-top: 2rem; text-align: right;">
      <button id="completePaymentBtn" class="primary-btn">Complete Payment</button>
    </div>
  `;
  container.appendChild(summary);

  populateCustomerInfo();
}

// 🙋 Populate customer info from Firestore
async function populateCustomerInfo() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      const infoEl = document.getElementById("customer-info");
      infoEl.innerHTML = `
        <strong>${data.firstName || ""} ${data.lastName || ""}</strong><br>
        <small>${user.email}</small>
      `;
    }
  } catch (err) {
    console.warn("⚠️ Couldn’t load user info:", err);
  }
}

// 🧼 Inject minimal CSS styles for checkout
function injectBaseStyles() {
  const style = document.createElement("style");
  style.textContent = `
    #checkout {
      position: fixed;
      top: 0; right: 0;
      width: 100%;
      max-width: 600px;
      height: 100vh;
      background: #fff;
      z-index: 9999;
      overflow-y: auto;
      box-shadow: -2px 0 10px rgba(0,0,0,0.15);
      animation: slideIn 0.4s ease forwards;
      font-family: 'Nunito Sans', sans-serif;
    }

    .checkout-panel {
      padding: 2rem;
    }

    .checkout-content h2 {
      margin-bottom: 1rem;
      color: #004cc7;
    }

    #closeCheckout {
      position: absolute;
      top: 12px;
      right: 16px;
      font-size: 2rem;
      background: none;
      border: none;
      cursor: pointer;
    }

    .checkout-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .checkout-item img {
      width: 70px;
      height: 70px;
      border-radius: 8px;
      object-fit: cover;
    }

    .item-details {
      flex: 1;
    }

    .item-name {
      font-weight: bold;
    }

    .item-qty-price {
      font-size: 0.95rem;
      margin-top: 4px;
    }

    .item-size {
      font-size: 0.85rem;
      color: #555;
    }

    .checkout-summary {
      margin-top: 1.5rem;
      font-size: 1rem;
    }

    .summary-line {
      font-weight: bold;
      text-align: right;
    }

    .checkout-section {
      margin-top: 2rem;
    }

    .checkout-section h3 {
      margin-bottom: 0.5rem;
      font-size: 1.1rem;
      color: #222;
    }

    .secondary-btn {
      background: none;
      border: 2px solid #007bff;
      padding: 0.4rem 1rem;
      border-radius: 6px;
      color: #007bff;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .secondary-btn:hover {
      background: #007bff;
      color: #fff;
    }

    .primary-btn {
      background: #007bff;
      color: #fff;
      border: none;
      padding: 0.6rem 1.5rem;
      border-radius: 6px;
      font-weight: bold;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.3s ease;
    }

    .primary-btn:hover {
      background: #0056b3;
    }

    @keyframes slideIn {
      from { right: -100%; }
      to { right: 0; }
    }

    @media (max-width: 768px) {
      #checkout {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(style);
}
