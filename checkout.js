import { db, auth } from './firebase.js';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

let currentUser = {
  name: "Anonymous",
  email: "no@email.com",
  address: {} // ← must be an object
};

// ✅ Load current user info and full address
async function loadCurrentUser() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            const address = data.address || data.deliveryAddress || {};

            currentUser = {
              uid: user.uid,
              name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || user.displayName || "Customer",
              email: user.email || "no@email.com",
              address: address
            };

            resolve(); // done loading
          } else {
            console.warn("User document not found in Firestore.");
            resolve();
          }
        } catch (err) {
          console.error("Error fetching user info:", err);
          reject(err);
        }
      } else {
        console.warn("User not authenticated");
        resolve(); // allow guest checkout
      }
    });
  });
}

const basket = JSON.parse(localStorage.getItem("daisyCart")) || [];
const summary = document.getElementById("basket-summary");
const subtotalDisplay = document.getElementById("subtotal-display");

// 🧾 Render basket contents
function renderBasket() {
  let subtotal = 0;
  summary.innerHTML = "";

  if (basket.length === 0) {
    summary.innerHTML = "<p>Your basket is empty.</p>";
    return;
  }

  basket.forEach(item => {
    const price = parseFloat(item.price || 0);
    const qty = parseFloat(item.qty || 0);
    subtotal += price * qty;

    const div = document.createElement("div");
    div.className = "basket-item";
    div.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div class="basket-details">
        <span class="item-name">${item.name} × ${qty}</span>
        <span class="item-price">£${(price * qty).toFixed(2)}</span>
      </div>
    `;
    summary.appendChild(div);
  });

  subtotalDisplay.textContent = `Subtotal: £${subtotal.toFixed(2)}`;
}

// 🧾 Submit order
export async function submitOrder() {
  if (basket.length === 0) {
    alert("You have nothing in the basket to checkout!");
    return;
  }

  const orderPayload = {
    userId: currentUser.uid,
    name: currentUser.name || "Anonymous",
    email: currentUser.email || "no@email.com",
    address: currentUser.address || {},
    items: basket.map(item => ({
      productId: item.id || "unknown",
      productName: item.name || "Unnamed",
      qty: parseInt(item.qty) || 1,
      price: parseFloat(item.price) || 0,
    })),
    status: "pending",
    createdAt: serverTimestamp()
  };

  console.log("Submitting order payload:", orderPayload);

  try {
    await addDoc(collection(db, "Orders"), orderPayload);
    alert("Order placed successfully! 🛒");
    localStorage.removeItem("daisyCart");
    window.location.href = "index.html";
  } catch (err) {
    console.error("Error placing order:", err);
    alert("Failed to place order. Please try again.");
  }
}

// 📦 On page load
document.addEventListener("DOMContentLoaded", async () => {
  await loadCurrentUser();
  renderBasket();

  const form = document.getElementById("checkout-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await submitOrder();
    });
  }
});
