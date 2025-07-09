import { auth, db, functions } from './firebase.js';
import { doc, getDoc, getDocs, collection } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-functions.js';

// 💳 Stripe Checkout for universal checkout
const stripe = Stripe("pk_test_XXXXXXXXXXXXXXXXXXXXXXXX");
const elements = stripe.elements();
const card = elements.create('card');

// 🧩 Inject payment form into your checkout panel
function renderStripeForm() {
  const formHtml = `
    <form id="payment-form" style="margin-top: 20px;">
      <div id="card-element" style="padding: 12px; border: 1px solid #ccc; border-radius: 8px; background: white;"></div>
      <div id="card-errors" role="alert" style="color: red; margin-top: 8px;"></div>
      <button id="completePaymentBtn" type="submit" style="margin-top: 16px; background-color: #000; color: white; padding: 12px 20px; border: none; border-radius: 6px; font-size: 16px;">
        Complete Payment
      </button>
    </form>
  `;

  const container = document.getElementById('checkout-body');
  container.insertAdjacentHTML('beforeend', formHtml);
  card.mount('#card-element');

  bindStripeFormLogic(); // ⏬ Bind Stripe logic to button
}

// 🧠 Fetch basket data (replace with your logic to fetch cart items)
async function getBasketData() {
  const stored = localStorage.getItem('basket');
  return stored ? JSON.parse(stored) : [];
}

// 🧠 Form handler logic
function bindStripeFormLogic() {
  const form = document.getElementById('payment-form');
  const completePaymentBtn = document.getElementById('completePaymentBtn');
  const cardErrors = document.getElementById('card-errors');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    completePaymentBtn.disabled = true;

    try {
      const items = await getBasketData(); // 🔁 your basket items
      const createIntent = httpsCallable(functions, 'createStripePaymentIntent');
      const { data } = await createIntent({ items });

      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card: card }
      });

      if (result.error) {
        cardErrors.textContent = result.error.message;
        completePaymentBtn.disabled = false;
      } else {
        if (result.paymentIntent.status === 'succeeded') {
          window.location.href = '/success.html';
        }
      }

    } catch (err) {
      console.error("🔥 Payment failed:", err);
      cardErrors.textContent = err.message;
      completePaymentBtn.disabled = false;
    }
  });
}

// 🔓 Global entry point
export async function initCheckout({ mode = "cart", product = null } = {}) {
  const existing = document.getElementById("checkout");
  if (existing) existing.remove();

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
  document.body.style.overflow = "hidden";

  document.getElementById("closeCheckout").onclick = () => {
    document.getElementById("checkout")?.remove();
    document.body.style.overflow = "";
  };

  const user = await waitForUser();
  if (!user) {
    document.getElementById("checkout-body").innerHTML = `<p>Please sign in to view your basket.</p>`;
    return;
  }

  if (mode === "direct") {
    renderProductCheckout(product, user);
  } else {
    const cart = await loadCartFromFirestore(user.uid);
    renderCartCheckout(cart, user);
  }

  injectBaseStyles();
}

// Wait for login
function waitForUser() {
  return new Promise(resolve => {
    onAuthStateChanged(auth, user => resolve(user));
  });
}

// Load Firestore basket items
async function loadCartFromFirestore(uid) {
  try {
    const snap = await getDocs(collection(db, "users", uid, "Basket"));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("❌ Failed to load cart from Firestore:", err);
    return [];
  }
}

// Render multiple items
function renderCartCheckout(cart, user) {
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
    <p class="summary-line">Total to pay: <strong>£${subtotal.toFixed(2)}</strong></p>
  `;
  container.appendChild(summary);

  renderCustomerAndAddress(container, user);
}

// Render single product (Buy Now)
function renderProductCheckout(product, user) {
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

  renderCustomerAndAddress(container, user);
}

// Render user info and address
async function renderCustomerAndAddress(container, user) {
  const userDoc = await getDoc(doc(db, "users", user.uid));
  const userData = userDoc.exists() ? userDoc.data() : {};

  const name = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
  const email = user.email;

  const customerDiv = document.createElement("div");
  customerDiv.className = "checkout-section";
  customerDiv.innerHTML = `
    <div class="section-box" id="customer-info">
    <div class="section-label">Customer Details</div>
      ${name || "(No name)"}<br>
      <span style="color: #666;">${email}</span>
    </div>
  `;

  const addressDiv = document.createElement("div");
  addressDiv.className = "checkout-section";
  addressDiv.innerHTML = `
    <div class="section-box" id="address-info"> <div class="section-label">Delivery Address</div>
    No address selected.
    </div>
    <button id="addAddressBtn" class="secondary-btn" style="margin-top: 0.5rem;">Add Address</button>
  `;
                  
  const checkoutBtn = document.createElement("button");
  checkoutBtn.textContent = "Complete Payment";
  checkoutBtn.className = "primary-btn";
  checkoutBtn.id = "stripeCheckoutBtn";
  checkoutBtn.style.marginTop = "2rem";

  container.appendChild(customerDiv);
  container.appendChild(addressDiv);
  container.appendChild(checkoutBtn);
  renderStripeForm();
}

// CSS Styles
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

    .checkout-content h2 {
      margin-bottom: 1rem;
      color: #0045c7;
      padding-left: 1rem;
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
      padding-right: 1rem;
      padding-left: 1rem;
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

    .section-label {
      font-size: 1rem;
      font-weight: 600;
      color: #222;
      margin-bottom: 0.25rem;
    }

    .section-box {
      background: #f9f9f9;
      padding: 1rem 1.25rem;
      margin-top: 0.5rem;
      font-size: 0.95rem;
      line-height: 1.4;
    }

    .primary-btn {
        display: block;
        margin: 2rem auto;
        background: black;
        color: white;
        padding: 0.75rem 3rem;
        font-weight: bold;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 1rem;
        text-align: center;
    }

    .secondary-btn {
      background: transparent;
      color: #007bff;
      border: 2px solid #007bff;
      padding: 0.5rem 1rem;
      font-weight: 500;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.95rem;
    }

    .primary-btn:hover,
    .secondary-btn:hover {
      opacity: 0.9;
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
