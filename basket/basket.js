import { db, auth } from '../firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import {
  doc, getDocs, collection, deleteDoc, setDoc
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

onAuthStateChanged(auth, (user) => {
  if (user) {
    loadFirestoreBasket(user.uid);
  } else {
    loadLocalBasket();
  }
});

async function loadFirestoreBasket(uid) {
  const snapshot = await getDocs(collection(db, "users", uid, "Basket"));
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderBasket(items, true, uid);
}

function loadLocalBasket() {
  const items = JSON.parse(localStorage.getItem("daisyCart") || "[]");
  renderBasket(items, false);
}

function renderBasket(items, isLoggedIn, uid = null) {
  const basketLeft = document.getElementById("basket-left");
  const emptyMsg = document.getElementById("basket-empty-message");

  basketLeft.innerHTML = "";
  let subtotal = 0;

  if (!items.length) {
    emptyMsg.style.display = "block";
    return;
  }

  emptyMsg.style.display = "none";

  items.forEach((item, index) => {
    const itemTotal = (item.price || 0) * (item.qty || 1);
    subtotal += itemTotal;

    const row = document.createElement("div");
    row.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.2rem 0;
      border-bottom: 1px solid #ccc;
      gap: 1.2rem;
    `;

    row.innerHTML = `
      <img src="${item.image}" alt="${item.name}" style="height: 60px; width: 60px; object-fit: cover; border-radius: 8px;">
      <div style="flex: 1;">
        <div style="font-weight: 600; font-size: 1rem; margin-bottom: 4px;">${item.name}</div>
        ${item.size ? `<div style="font-size: 0.85rem; color: #666;">Size: ${item.size}</div>` : ""}
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
          <button class="qty-minus" data-index="${index}" style="${btnStyle}">−</button>
          <span style="min-width: 24px; text-align: center;">${item.qty}</span>
          <button class="qty-plus" data-index="${index}" style="${btnStyle}">+</button>
        </div>
      </div>
      <div style="font-weight: 600; min-width: 60px; text-align: right;">£${itemTotal.toFixed(2)}</div>
      <button class="delete-btn" data-index="${index}" style="${delStyle}">×</button>
    `;

    basketLeft.appendChild(row);
  });

  document.getElementById("subtotal-display-summary").textContent = `£${subtotal.toFixed(2)}`;
  document.getElementById("total-display-summary").textContent = `£${subtotal.toFixed(2)}`;

  document.querySelectorAll(".qty-plus").forEach(btn => {
    btn.addEventListener("click", e => handleQtyChange(e, items, isLoggedIn, uid, 1));
  });
  document.querySelectorAll(".qty-minus").forEach(btn => {
    btn.addEventListener("click", e => handleQtyChange(e, items, isLoggedIn, uid, -1));
  });
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", e => handleDelete(e, items, isLoggedIn, uid));
  });
}

async function handleDelete(e, items, isLoggedIn, uid) {
  const index = e.currentTarget.dataset.index;
  const item = items[index];

  if (isLoggedIn) {
    await deleteDoc(doc(db, "users", uid, "basket", item.id));
    const snapshot = await getDocs(collection(db, "users", uid, "basket"));
    const updated = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderBasket(updated, true, uid);
  } else {
    items.splice(index, 1);
    localStorage.setItem("daisyCart", JSON.stringify(items));
    renderBasket(items, false);
  }
}

async function handleQtyChange(e, items, isLoggedIn, uid, delta) {
  const index = e.currentTarget.dataset.index;
  const item = items[index];
  item.qty = Math.max(1, (item.qty || 1) + delta);

  if (isLoggedIn) {
    await setDoc(doc(db, "users", uid, "basket", item.id), item);
    const snapshot = await getDocs(collection(db, "users", uid, "basket"));
    const updated = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderBasket(updated, true, uid);
  } else {
    items[index] = item;
    localStorage.setItem("daisyCart", JSON.stringify(items));
    renderBasket(items, false);
  }
}

function renderSummaryBox(subtotal = 0, total = 0) {
  const container = document.getElementById("summary-container");

  // Inject style once
  if (!document.getElementById("summary-styles")) {
    const style = document.createElement("style");
    style.id = "summary-styles";
    style.textContent = `
      .summary-box {
        background: white;
        padding: 1.8rem;
        border-radius: 16px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.08);
        font-size: 0.95rem;
        min-width: 320px;
        height: fit-content;
      }
      .summary-box h3 {
        font-size: 1.3rem;
        margin-bottom: 1rem;
        color: var(--electric-blue);
      }
      .promo-code {
        display: flex;
        gap: 1.5rem;
        margin-bottom: 1rem;
      }
      .promo-code input {
        flex: 1;
        padding: 0.5rem;
        font-size: 0.95rem;
        border: 1px solid #ccc;
        border-radius: 6px;
      }
      .promo-code button {
        padding: 0.5rem 1rem;
        background: #236b27;
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
      }
      .total-line {
        display: flex;
        justify-content: space-between;
        margin: 0.4rem 0;
      }
      .button-row {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1rem;
        padding: 0 1.5rem;
      }
      .summary-btn {
        background-color: black;
        color: white;
        border: none;
        padding: 0.8rem;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        font-family: 'Nunito Sans', sans-serif;
        transition: 0.3s;
      }
      .summary-btn:hover {
        background-color: #68b2a8;
      }
    `;
    document.head.appendChild(style);
  }

  // Inject the summary box
  container.innerHTML = `
    <div class="basket-summary">
      <div class="summary-box">
        <h3>Order Summary</h3>
        <div class="promo-code">
          <input type="text" id="promo-code-input" placeholder="Promo Code">
          <button id="apply-promo-btn">Apply</button>
        </div>
        <div class="totals">
          <div class="total-line"><span>Subtotal:</span><span id="subtotal-display-summary">£${subtotal.toFixed(2)}</span></div>
          <div class="total-line"><span>Shipping:</span><span>£0.00</span></div>
          <div class="total-line final-total"><span>Total:</span><span id="total-display-summary">£${total.toFixed(2)}</span></div>
        </div>
        <div class="button-row">
          <button class="summary-btn" id="checkoutBtn">Proceed to Checkout</button>
        </div>
      </div>
    </div>
  `;

  // Hook up checkout button
  document.getElementById("checkoutBtn").addEventListener("click", () => {
    import("/checkout.js").then(({ initCheckout }) => {
      initCheckout({ mode: "cart" });
    });
  });
}

// === Inline Style Strings ===
const btnStyle = `
  padding: 2px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-weight: bold;
  font-size: 1rem;
  background: white;
  cursor: pointer;
`;

const delStyle = `
  font-size: 1.2rem;
  color: red;
  background: none;
  border: none;
  cursor: pointer;
`;
