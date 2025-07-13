import { db, auth } from '../firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import {
  doc, getDocs, collection
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

// 🔄 Entry point
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadFirestoreBasket(user.uid);
  } else {
    loadLocalBasket();
  }
});

// ============================
// 🔥 Load Basket from Firestore
// ============================
async function loadFirestoreBasket(uid) {
  const basketRef = collection(db, "users", uid, "basket");
  const snapshot = await getDocs(basketRef);
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderBasket(items);
}

// ============================
// 💾 Load Basket from LocalStorage
// ============================
function loadLocalBasket() {
  const cart = JSON.parse(localStorage.getItem("daisyCart") || "[]");
  renderBasket(cart);
}

// ============================
// 🎨 Render Basket Items
// ============================
function renderBasket(items) {
  const basketContainer = document.getElementById("basket-left");
  const emptyMessage = document.getElementById("basket-empty-message");

  basketContainer.innerHTML = ""; // Clear existing
  if (items.length === 0) {
    emptyMessage.style.display = "block";
    return;
  } else {
    emptyMessage.style.display = "none";
  }

  let subtotal = 0;

  for (const item of items) {
    const itemTotal = (item.price || 0) * (item.qty || 1);
    subtotal += itemTotal;

    const itemEl = document.createElement("div");
    itemEl.className = "basket-item-row";

    itemEl.innerHTML = `
      <div style="flex:1">
        <strong>${item.name}</strong><br/>
        ${item.size ? `Size: ${item.size}<br/>` : ""}
        Quantity: ${item.qty}
      </div>
      <div class="item-price">£${itemTotal.toFixed(2)}</div>
    `;

    basketContainer.appendChild(itemEl);
  }

  // Update summary
  document.getElementById("subtotal-display-summary").textContent = `£${subtotal.toFixed(2)}`;
  document.getElementById("total-display-summary").textContent = `£${subtotal.toFixed(2)}`;
}
