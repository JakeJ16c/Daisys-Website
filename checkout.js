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
  address: "Not provided"
};

// 🔐 Get user info + delivery address from Firestore
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        const address = data.deliveryAddress || {};

        currentUser = {
          name: data.name || user.displayName || "Customer",
          email: user.email || "no@email.com",
          address: `${address.houseNumber || ""} ${address.street || ""}, ${address.city || ""}, ${address.county || ""}, ${address.postcode || ""}`.trim()
        };
      } else {
        console.warn("User document not found in Firestore.");
      }
    } catch (err) {
      console.error("Error fetching user delivery address:", err);
    }
  }
});

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
    name: currentUser?.name || "Anonymous",
    email: currentUser?.email || "no@email.com",
    address: currentUser?.address || "Not provided",
    items: basket.map(item => ({
      productId: item.id || "unknown",
      productName: item.name || "Unnamed",
      qty: parseFloat(item.qty) || 1,
      price: parseFloat(item.price) || 0
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
document.addEventListener("DOMContentLoaded", () => {
  renderBasket();

  const form = document.getElementById("checkout-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitOrder();
    });
  }
});
