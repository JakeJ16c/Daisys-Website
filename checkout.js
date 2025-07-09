// checkout.js – Unified Stripe Checkout with Promo + Order Submission
import { auth, db, functions } from './firebase.js';
import {
  doc, getDoc, getDocs, updateDoc, collection, runTransaction, serverTimestamp, deleteDoc
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-functions.js';

// === STRIPE SETUP ===
if (!window.Stripe) {
  const script = document.createElement('script');
  script.src = 'https://js.stripe.com/v3/';
  script.async = false;
  document.head.appendChild(script);
}

await new Promise(resolve => {
  const interval = setInterval(() => {
    if (window.Stripe) {
      clearInterval(interval);
      resolve();
    }
  }, 50);
});

const stripe = Stripe("pk_test_51RWjp7C0ROfvT2EdFetsUx7ntfuVlWZv7C4LOqZx3foe15C7vzkRuAqcHTpf8SJBc29gQlCDojeCmSN6tjTnmDSm00IUGRugqa");
const elements = stripe.elements();
const card = elements.create('card');

// === STATE ===
let currentUser = null;
let currentCart = [];
let activePromo = null;
let discountAmount = 0;
let finalTotal = 0;

// === INIT CHECKOUT FLOW ===
export async function initCheckout({ mode = "cart", product = null } = {}) {
  const wrapper = document.getElementById("checkout") || document.createElement("div");
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
    wrapper.remove();
    document.body.style.overflow = "";
  };

  currentUser = await new Promise(res => onAuthStateChanged(auth, res));
  if (!currentUser) return document.getElementById("checkout-body").innerHTML = `<p>Please sign in to view your basket.</p>`;

  if (mode === "direct") {
    currentCart = [product];
  } else {
    const snap = await getDocs(collection(db, "users", currentUser.uid, "Basket"));
    currentCart = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  if (!currentCart.length) return document.getElementById("checkout-body").innerHTML = `<p>Your basket is empty.</p>`;

  restorePromoIfExists();
  renderCart();
  injectBaseStyles();
}

// === RENDER CART ITEMS & TOTAL ===
async function renderCart() {
  const container = document.getElementById("checkout-body");
  container.innerHTML = "";

  let subtotal = 0;
  currentCart.forEach(item => {
    const line = item.qty * item.price;
    subtotal += line;
    container.innerHTML += `
      <div class="checkout-item">
        <div class="item-img"><img src="${item.image}" alt="${item.name}"></div>
        <div class="item-details">
          <div class="item-name">${item.name}</div>
          ${item.size ? `<div class="item-size">Size: ${item.size}</div>` : ""}
          <div class="item-qty-price">Qty: ${item.qty} × £${item.price.toFixed(2)} = <strong>£${line.toFixed(2)}</strong></div>
        </div>
      </div>
    `;
  });

  discountAmount = activePromo
    ? (activePromo.type === "percentage"
        ? subtotal * (activePromo.discount / 100)
        : activePromo.discount)
    : 0;
  finalTotal = Math.max(0, subtotal - discountAmount);

  container.innerHTML += `
    <div class="checkout-summary">
      <hr>
      ${activePromo ? `<p class="summary-line">Promo (${activePromo.code}): −£${discountAmount.toFixed(2)}</p>` : ""}
      <p class="summary-line">Total to pay: <strong>£${finalTotal.toFixed(2)}</strong></p>
      <input id="promo-code-input" placeholder="Enter promo code" />
      <button id="apply-promo-btn" class="secondary-btn" style="margin-top: 0.5rem;">Apply Promo</button>
    </div>
    <div id="apple-pay-button" style="margin-top: 2rem;"></div>
  `;

  document.getElementById("apply-promo-btn").onclick = applyPromoCode;
  await renderCustomerAndAddress(container);
  addApplePayButton(finalTotal);
  renderStripeForm();
}

// === Render Customer Details ===
async function renderCustomerAndAddress(container) {
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const data = snap.exists() ? snap.data() : {};
  const name = `${data.firstName || ""} ${data.lastName || ""}`.trim();

  container.innerHTML += `
    <div class="checkout-section">
      <div class="section-box" id="customer-info">
        <div class="section-label">Customer Details</div>
        ${name || "(No name)"}<br>
        <span style="color: #666;">${currentUser.email}</span>
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

// === PROMO CODE LOGIC ===
async function applyPromoCode() {
  const codeInput = document.getElementById("promo-code-input");
  const code = codeInput.value.trim().toUpperCase();
  if (!code) return alert("Enter a promo code.");

  try {
    const snap = await getDocs(collection(db, "PromoCodes"));
    for (const docSnap of snap.docs) {
      const promo = docSnap.data();
      if (promo.code.toUpperCase() === code) {
        const subtotal = currentCart.reduce((a, b) => a + b.qty * b.price, 0);
        if (subtotal < (promo.minSpend || 0)) return alert(`Min spend for this promo is £${promo.minSpend}`);

        activePromo = { ...promo, code };
        localStorage.setItem("activePromo", JSON.stringify(activePromo));
        renderCart();
        alert("Promo code applied!");
        return;
      }
    }
    alert("Promo not found.");
  } catch (err) {
    console.error("Promo error:", err);
    alert("Could not apply promo.");
  }
}

function restorePromoIfExists() {
  const promo = JSON.parse(localStorage.getItem("activePromo"));
  if (promo) activePromo = promo;
}

// === STRIPE FORM ===
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

  document.getElementById("payment-form").onsubmit = handleSubmitPayment;
}

async function handleSubmitPayment(e) {
  e.preventDefault();
  const btn = document.getElementById("completePaymentBtn");
  btn.disabled = true;

  try {
    const createIntent = httpsCallable(functions, 'createStripePaymentIntent');
    const { data } = await createIntent({ items: currentCart });
    const result = await stripe.confirmCardPayment(data.clientSecret, { payment_method: { card } });

    if (result.error) {
      document.getElementById("card-errors").textContent = result.error.message;
      btn.disabled = false;
    } else {
      await submitOrder();
      window.location.href = "/success.html";
    }
  } catch (err) {
    console.error("Payment error:", err);
    alert("Something went wrong.");
    btn.disabled = false;
  }
}

// === ORDER SUBMISSION ===
async function submitOrder() {
  const subtotal = currentCart.reduce((a, b) => a + b.price * b.qty, 0);

  // 🔄 Update stock
  for (const item of currentCart) {
    const ref = doc(db, "Products", item.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) continue;

    const data = snap.data();
    if (item.size && data.sizes?.length > 0) {
      const newSizes = data.sizes.map(s => s.size === item.size
        ? { ...s, stock: Math.max(0, s.stock - item.qty) }
        : s);
      await updateDoc(ref, { sizes: newSizes });
    } else {
      await updateDoc(ref, { stock: Math.max(0, (data.stock || 0) - item.qty) });
    }
  }

  // 🔢 Order number
  const counterRef = doc(db, "meta", "orderCounter");
  const orderRef = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const count = snap.exists() ? snap.data().count : 0;
    const newRef = doc(collection(db, "Orders"));
    tx.set(newRef, {
      userId: currentUser.uid,
      name: currentUser.displayName || "Anonymous",
      email: currentUser.email,
      address: {}, // TODO: Pull saved address
      items: currentCart,
      status: "Confirmed",
      createdAt: serverTimestamp(),
      promoCode: activePromo?.code || null,
      discount: discountAmount,
      finalTotal: finalTotal,
      orderNumber: count + 1
    });
    tx.update(counterRef, { count: count + 1 });
    return newRef;
  });

  // 🧹 Cleanup
  await clearFirestoreBasket(currentUser.uid);
  localStorage.removeItem("basket");
  localStorage.removeItem("activePromo");
}

// === BASKET CLEANUP ===
async function clearFirestoreBasket(uid) {
  const snap = await getDocs(collection(db, "users", uid, "Basket"));
  for (const docSnap of snap.docs) {
    await deleteDoc(doc(db, "users", uid, "Basket", docSnap.id));
  }
}

// === APPLE PAY BUTTON ===
function addApplePayButton(total) {
  const paymentRequest = stripe.paymentRequest({
    country: 'GB',
    currency: 'gbp',
    total: { label: 'Golden By Daisy', amount: Math.round(total * 100) },
    requestPayerName: true,
    requestPayerEmail: true,
  });

  const prButton = elements.create('paymentRequestButton', {
    paymentRequest,
    style: { paymentRequestButton: { type: 'default', theme: 'dark', height: '44px' } }
  });

  paymentRequest.canMakePayment().then(result => {
    if (result) prButton.mount('#apple-pay-button');
    else document.getElementById('apple-pay-button').style.display = 'none';
  });

  paymentRequest.on('paymentmethod', ev => {
    console.log('🍏 Apple Pay placeholder clicked');
    ev.complete('fail');
  });
}

// === STYLES ===
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
