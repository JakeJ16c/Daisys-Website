// basket-checkout.js – Handles checkout, promos, order saving, Stripe
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-functions.js';
import { db, auth, functions } from './firebase.js';
import {
  collection, doc, getDoc, getDocs,
  deleteDoc, runTransaction, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

let activePromo = null;
let discountAmount = 0;
let finalTotal = 0;

// ✅ Update summary UI with correct subtotal, discount, and total
function updateSummaryUI(subtotal, discount, final) {
  const discountLine = document.getElementById("discount-line");
  const subtotalBox = document.querySelector("#subtotal-display-summary");
  const totalBox = document.querySelector("#total-display-summary");
  const finalCheckout = document.querySelector("#total-display-checkout");

  if (subtotalBox) subtotalBox.textContent = `£${subtotal.toFixed(2)}`;
  if (totalBox) totalBox.textContent = `£${final.toFixed(2)}`;
  if (finalCheckout) finalCheckout.textContent = `£${final.toFixed(2)}`;

  if (discountLine) {
    if (discount > 0) {
      discountLine.style.display = "flex";
      discountLine.querySelector(".summary-label").textContent = `Promo (${activePromo.code})`;
      discountLine.querySelector(".summary-value").textContent = `−£${discount.toFixed(2)}`;
    } else {
      discountLine.style.display = "none";
    }
  }
}

// ✅ Apply promo code from Firestore
async function applyPromoCode() {
  const codeInput = document.getElementById("promo-code-input");
  const code = codeInput.value.trim().toUpperCase();
  if (!code) return alert("Enter a promo code.");

  try {
    const snap = await getDocs(collection(db, "PromoCodes"));
    let found = false;

    snap.forEach(doc => {
      const promo = doc.data();
      if (promo.code.toUpperCase() === code) {
        found = true;
        activePromo = { ...promo, code };
        localStorage.setItem("activePromo", JSON.stringify(activePromo));

        const basket = JSON.parse(localStorage.getItem("daisyCart")) || [];
        const subtotal = basket.reduce((acc, item) => acc + item.price * item.qty, 0);

        if (subtotal < (promo.minSpend || 0)) {
          return alert(`Minimum spend for this promo is £${promo.minSpend}`);
        }

        discountAmount = promo.type === "percentage"
          ? subtotal * (promo.discount / 100)
          : promo.discount;

        finalTotal = Math.max(0, subtotal - discountAmount);
        updateSummaryUI(subtotal, discountAmount, finalTotal);
        alert("Promo code applied!");
      }
    });

    if (!found) alert("Promo code not found.");
  } catch (err) {
    console.error("Error applying promo:", err);
    alert("Something went wrong applying the code.");
  }
}

// ✅ Restore promo from localStorage
function restorePromoIfExists() {
  const promo = JSON.parse(localStorage.getItem("activePromo"));
  const basket = JSON.parse(localStorage.getItem("daisyCart")) || [];
  const subtotal = basket.reduce((acc, item) => acc + item.price * item.qty, 0);

  if (promo) {
    activePromo = promo;

    discountAmount = promo.type === "percentage"
      ? subtotal * (promo.discount / 100)
      : promo.discount;

    finalTotal = Math.max(0, subtotal - discountAmount);
    updateSummaryUI(subtotal, discountAmount, finalTotal);
  } else {
    updateSummaryUI(subtotal, 0, subtotal);
  }
}

// ✅ Stripe Checkout logic
async function handleStripeCheckout() {
  const cart = JSON.parse(localStorage.getItem("daisyCart")) || [];
  if (cart.length === 0) return alert("Your basket is empty.");

  try {
    const createCheckout = httpsCallable(functions, "createStripeCheckout");
    const result = await createCheckout({ items: cart });

    if (result.data && result.data.url) {
      window.location.href = result.data.url;
    } else {
      alert("Something went wrong. No checkout URL returned.");
    }
  } catch (err) {
    console.error("Stripe Checkout Error:", err.message);
    alert("Error starting checkout. Please try again.");
  }
}

// ✅ DOM Ready
document.addEventListener("DOMContentLoaded", async () => {
  localStorage.removeItem("orderSubmitted");

  const applyBtn = document.getElementById("apply-promo-btn");
  if (applyBtn) applyBtn.addEventListener("click", applyPromoCode);

  restorePromoIfExists();

  const stripeBtn = document.getElementById("stripeCheckoutBtn");
  if (stripeBtn) stripeBtn.addEventListener("click", handleStripeCheckout);
});
