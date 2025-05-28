import { db } from './firebase.js';
import {
  collection,
  addDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

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

// 🧾 Order submission
export async function submitOrder() {
  const nameInput = document.getElementById("cust-name");
  const emailInput = document.getElementById("cust-email");
  const name = nameInput?.value.trim();
  const email = emailInput?.value.trim();

  if (basket.length === 0) {
    alert("You have nothing in the basket to checkout!");
    return;
  }

  try {
    await addDoc(collection(db, "Orders"), {
      name,
      email,
      items: basket.map(item => ({
        productId: item.id,
        productName: item.name,
        qty: item.qty,
        price: item.price
      })),
      status: "pending",
      createdAt: serverTimestamp()
    });

    alert("Order placed successfully! 🛒");
    localStorage.removeItem("daisyCart");
    window.location.href = "index.html";
  } catch (err) {
    console.error("Error placing order:", err);
    alert("Failed to place order. Please try again.");
  }
}

// 📦 On page load: render basket + attach submit handler
document.addEventListener("DOMContentLoaded", () => {
  renderBasket();

  const form = document.querySelector("form");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    submitOrder();
  });
});
