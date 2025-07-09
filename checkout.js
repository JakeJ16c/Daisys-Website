import { auth, db, functions } from './firebase.js';
import { doc, getDoc, getDocs, collection } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-functions.js';

// Inject Stripe.js if needed
if (!window.Stripe) {
  const script = document.createElement('script');
  script.src = 'https://js.stripe.com/v3/';
  script.async = false;
  document.head.appendChild(script);
}

// Wait for Stripe to be loaded before initializing
async function waitForStripeReady() {
  return new Promise(resolve => {
    const interval = setInterval(() => {
      if (window.Stripe) {
        clearInterval(interval);
        resolve();
      }
    }, 50);
  });
}

await waitForStripeReady();

const stripe = Stripe("pk_test_51RWjp7C0ROfvT2EdFetsUx7ntfuVlWZv7C4LOqZx3foe15C7vzkRuAqcHTpf8SJBc29gQlCDojeCmSN6tjTnmDSm00IUGRugqa");
const elements = stripe.elements();
const card = elements.create('card');

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
        <div id="checkout-body"><p class="loading-text">Loading...</p></div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);
  document.body.style.overflow = "hidden";

  document.getElementById("closeCheckout").onclick = () => {
    document.getElementById("checkout")?.remove();
    document.body.style.overflow = "";
  };

  const user = await new Promise(res => onAuthStateChanged(auth, res));
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

async function loadCartFromFirestore(uid) {
  try {
    const snap = await getDocs(collection(db, "users", uid, "Basket"));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("❌ Failed to load cart:", err);
    return [];
  }
}

function renderCartCheckout(cart, user) {
  const container = document.getElementById("checkout-body");
  container.innerHTML = "";

  if (!cart.length) {
    container.innerHTML = `<p>Your basket is empty.</p>`;
    return;
  }

  let subtotal = 0;
  cart.forEach(item => {
    const lineTotal = item.qty * item.price;
    subtotal += lineTotal;

    container.innerHTML += `
      <div class="checkout-item">
        <div class="item-img"><img src="${item.image}" alt="${item.name}"></div>
        <div class="item-details">
          <div class="item-name">${item.name}</div>
          ${item.size && item.size.toLowerCase() !== "onesize" ? `<div class="item-size">Size: ${item.size}</div>` : ""}
          <div class="item-qty-price">Qty: ${item.qty} × £${item.price.toFixed(2)} = <strong>£${lineTotal.toFixed(2)}</strong></div>
        </div>
      </div>
    `;
  });

  container.innerHTML += `
    <div class="checkout-summary">
      <hr>
      <p class="summary-line">Total to pay: <strong>£${subtotal.toFixed(2)}</strong></p>
    </div>
    <div id="apple-pay-button" style="margin-top: 2rem;"></div>
  `;

  renderCustomerAndAddress(container, user);
  addApplePayButton(subtotal);
  renderStripeForm();
}

function renderProductCheckout(product, user) {
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
    <div id="apple-pay-button" style="margin-top: 2rem;"></div>
  `;

  renderCustomerAndAddress(container, user);
  addApplePayButton(total);
  renderStripeForm();
}

async function renderCustomerAndAddress(container, user) {
  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.exists() ? snap.data() : {};
  const name = `${data.firstName || ""} ${data.lastName || ""}`.trim();

  container.innerHTML += `
    <div class="checkout-section">
      <div class="section-box" id="customer-info">
        <div class="section-label">Customer Details</div>
        ${name || "(No name)"}<br>
        <span style="color: #666;">${user.email}</span>
      </div>
    </div>
    <div class="checkout-section">
      <div class="section-box" id="address-info">
        <div class="section-label">Delivery Address</div>
        No address selected.
      </div>
      <button id="addAddressBtn" class="secondary-btn" style="margin-top: 0.5rem;">Add Address</button>
    </div>
  `;
}

function renderStripeForm() {
  const container = document.getElementById("checkout-body");
  container.insertAdjacentHTML('beforeend', `
    <form id="payment-form" style="margin: 2rem 1rem;">
      <div id="card-element" style="padding: 12px; border: 1px solid #ccc; border-radius: 8px; background: white;"></div>
      <div id="card-errors" role="alert" style="color: red; margin-top: 8px;"></div>
      <button id="completePaymentBtn" type="submit" class="completepayment-btn">Complete Payment</button>
    </form>
  `);
  card.mount('#card-element');
  bindStripeFormLogic();
}

function bindStripeFormLogic() {
  const form = document.getElementById('payment-form');
  const completePaymentBtn = document.getElementById('completePaymentBtn');
  const cardErrors = document.getElementById('card-errors');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    completePaymentBtn.disabled = true;

    try {
      const basket = JSON.parse(localStorage.getItem('basket') || "[]");
      const createIntent = httpsCallable(functions, 'createStripePaymentIntent');
      const { data } = await createIntent({ items: basket });

      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card }
      });

      if (result.error) {
        cardErrors.textContent = result.error.message;
        completePaymentBtn.disabled = false;
      } else if (result.paymentIntent.status === 'succeeded') {
        window.location.href = '/success.html';
      }

    } catch (err) {
      cardErrors.textContent = err.message;
      completePaymentBtn.disabled = false;
      console.error("🔥 Stripe Error:", err);
    }
  });
}

function addApplePayButton(total) {
  const paymentRequest = stripe.paymentRequest({
    country: 'GB',
    currency: 'gbp',
    total: {
      label: 'Golden By Daisy',
      amount: Math.round(total * 100),
    },
    requestPayerName: true,
    requestPayerEmail: true,
  });

  const prButton = elements.create('paymentRequestButton', {
    paymentRequest,
    style: {
      paymentRequestButton: {
        type: 'default',
        theme: 'dark',
        height: '44px',
      },
    },
  });

  paymentRequest.canMakePayment().then(result => {
    if (result) {
      prButton.mount('#apple-pay-button');
    } else {
      document.getElementById('apple-pay-button').style.display = 'none';
    }
  });

  paymentRequest.on('paymentmethod', ev => {
    console.log('🍏 Apple Pay clicked (test fallback)');
    ev.complete('fail');
  });
}

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
      padding: 0 1rem;
    }

    .checkout-item img {
      width: 70px;
      height: 70px;
      border-radius: 8px;
      object-fit: cover;
    }

    .item-details { flex: 1; }
    .item-name { font-weight: bold; }
    .item-qty-price { font-size: 0.95rem; margin-top: 4px; }
    .item-size { font-size: 0.85rem; color: #555; }

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

    .completepayment-btn {
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
      #checkout { width: 100%; }
    }
  `;
  document.head.appendChild(style);
}
