import { auth, db } from './firebase.js';
import { doc, getDoc, getDocs, collection } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

export async function initCheckout({ mode = "cart", product = null } = {}) {
  // Remove any existing instances
  document.getElementById("checkout")?.remove();
  document.getElementById("checkout-backdrop")?.remove();

  // 🔲 Create backdrop
  const backdrop = document.createElement("div");
  backdrop.id = "checkout-backdrop";
  backdrop.onclick = () => closeCheckout(); // click to dismiss
  document.body.appendChild(backdrop);

  // 🧾 Create floating checkout container
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

  // ❌ Close button
  document.getElementById("closeCheckout").onclick = () => closeCheckout();

  // 🚫 Lock scroll
  document.body.style.overflow = "hidden";

  // 🧠 Mode handling
  if (mode === "direct") {
    renderProductCheckout(product);
  } else {
    const user = await waitForUser();
    if (!user) {
      document.getElementById("checkout-body").innerHTML = `<p>Please sign in to view your basket.</p>`;
      return;
    }

    const cart = await loadCartFromFirestore(user.uid);
    renderCartCheckout(cart);
  }

  injectBaseStyles();
}

function closeCheckout() {
  document.getElementById("checkout")?.remove();
  document.getElementById("checkout-backdrop")?.remove();
  document.body.style.overflow = ""; // restore scroll
}

function waitForUser() {
  return new Promise(resolve => {
    onAuthStateChanged(auth, user => resolve(user));
  });
}

async function loadCartFromFirestore(uid) {
  try {
    const snap = await getDocs(collection(db, "users", uid, "Basket"));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("❌ Failed to load cart from Firestore:", err);
    return [];
  }
}

function renderCartCheckout(cart) {
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
    const lineTotal = item.qty * item.price;
    subtotal += lineTotal;

    itemDiv.innerHTML = `
      <div class="item-img"><img src="${item.image}" alt="${item.name}"></div>
      <div class="item-details">
        <div class="item-name">${item.name}</div>
        ${item.size && item.size.toLowerCase() !== "onesize" ? `<div class="item-size">Size: ${item.size}</div>` : ""}
        <div class="item-qty-price">Qty: ${item.qty} × £${item.price.toFixed(2)} = <strong>£${lineTotal.toFixed(2)}</strong></div>
      </div>
    `;
    container.appendChild(itemDiv);
  });

  const summary = document.createElement("div");
  summary.className = "checkout-summary";
  summary.innerHTML = `
    <hr>
    <p class="summary-line">Subtotal: <strong>£${subtotal.toFixed(2)}</strong></p>
    <p style="margin-top: 1rem;"><em>More summary features coming soon (promo codes, delivery, etc)</em></p>
  `;
  container.appendChild(summary);
}

function renderProductCheckout(product) {
  const container = document.getElementById("checkout-body");
  if (!product) {
    container.innerHTML = `<p>Missing product data.</p>`;
    return;
  }

  const lineTotal = product.price * product.qty;

  container.innerHTML = `
    <div class="checkout-item">
      <div class="item-img"><img src="${product.image}" alt="${product.name}"></div>
      <div class="item-details">
        <div class="item-name">${product.name}</div>
        ${product.size && product.size.toLowerCase() !== "onesize" ? `<div class="item-size">Size: ${product.size}</div>` : ""}
        <div class="item-qty-price">Qty: ${product.qty} × £${product.price.toFixed(2)} = <strong>£${lineTotal.toFixed(2)}</strong></div>
      </div>
    </div>
    <hr>
    <p class="summary-line">Total: <strong>£${lineTotal.toFixed(2)}</strong></p>
  `;
}

// 💅 Inject floating styles
function injectBaseStyles() {
  const style = document.createElement("style");
  style.textContent = `
    #checkout-backdrop {
      position: fixed;
      top: 0; left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.4);
      z-index: 9998;
    }

    #checkout {
      position: fixed;
      top: 0;
      right: 0;
      width: 100%;
      max-width: 600px;
      height: 100vh;
      background: #fff;
      z-index: 9999;
      overflow-y: auto;
      box-shadow: -2px 0 15px rgba(0, 0, 0, 0.2);
      animation: slideIn 0.4s ease forwards;
      font-family: 'Nunito Sans', sans-serif;
    }

    .checkout-panel {
      padding: 2rem;
    }

    .checkout-content h2 {
      margin-bottom: 1rem;
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

    @keyframes slideIn {
      from { right: -100%; opacity: 0; }
      to { right: 0; opacity: 1; }
    }

    @media (max-width: 768px) {
      #checkout {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(style);
}
