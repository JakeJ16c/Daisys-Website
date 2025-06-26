// basket-checkout.js – Handles checkout, promos, Firestore order saving, Stripe
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

function updateSummaryUI(subtotal, discount, final) {
  const discountLine = document.getElementById("discount-line");
  const finalTotalLine = document.getElementById("final-total-line");

  // Update summary boxes if present
  if (document.querySelector("#subtotal-display-summary"))
    document.querySelector("#subtotal-display-summary").textContent = `£${subtotal.toFixed(2)}`;
  if (document.querySelector("#total-display-summary"))
    document.querySelector("#total-display-summary").textContent = `£${final.toFixed(2)}`;
  if (document.querySelector("#total-display-checkout"))
    document.querySelector("#total-display-checkout").textContent = `£${final.toFixed(2)}`;

  // Discount line logic
  if (discountLine && finalTotalLine) {
    if (discount > 0) {
      discountLine.style.display = "flex";
      discountLine.querySelector(".summary-label").textContent = `Promo (${activePromo.code})`;
      discountLine.querySelector(".summary-value").textContent = `−£${discount.toFixed(2)}`;
    } else {
      discountLine.style.display = "none";
    }

    finalTotalLine.querySelector(".summary-value").textContent = `£${final.toFixed(2)}`;
  }
}

// 🔁 Restore stored promo on reload
function restorePromoIfExists() {
  const promo = JSON.parse(localStorage.getItem("activePromo"));
  const basket = JSON.parse(localStorage.getItem("daisyCart")) || [];
  const subtotal = basket.reduce((acc, item) => acc + (item.price * item.qty), 0);

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

// 🔁 Apply promo code on click
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
        localStorage.setItem("activePromo", JSON.stringify(activePromo)); // Save for reload

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

// 👤 Load current user info
let currentUser = { name: "Anonymous", email: "no@email.com", address: {} };

async function loadCurrentUser() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          currentUser = {
            uid: user.uid,
            name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            email: user.email,
            address: data.address || {}
          };
        }
      }
      resolve();
    });
  });
}

// 🗑 Clear basket from Firestore
async function clearFirestoreBasket(userId) {
  const basketRef = collection(db, `users/${userId}/Basket`);
  const snap = await getDocs(basketRef);

  await Promise.all(snap.docs.map(docSnap =>
    deleteDoc(doc(db, `users/${userId}/Basket/${docSnap.id}`))
  ));
}

// ✅ Submit order logic
async function submitOrder() {
  const basket = JSON.parse(localStorage.getItem("daisyCart")) || [];
  if (basket.length === 0) return alert("You have nothing in the basket!");

  await loadCurrentUser();

  const subtotal = basket.reduce((acc, item) => acc + item.price * item.qty, 0);
  discountAmount = activePromo
    ? (activePromo.type === "percentage"
        ? subtotal * (activePromo.discount / 100)
        : activePromo.discount)
    : 0;
  finalTotal = Math.max(0, subtotal - discountAmount);

  const order = {
    userId: currentUser.uid || "guest",
    name: currentUser.name || "Anonymous",
    email: currentUser.email || "no@email.com",
    address: currentUser.address || {},
    items: basket.map(item => ({
      productId: item.id,
      productName: item.name,
      qty: item.qty,
      price: item.price,
      size: item.size || null
    })),
    status: "Confirmed",
    createdAt: serverTimestamp(),
    promoCode: activePromo ? activePromo.code : null,
    discount: discountAmount,
    finalTotal: finalTotal
  };

  try {
    const counterRef = doc(db, "meta", "orderCounter");
    const orderRef = await runTransaction(db, async (tx) => {
      const counterSnap = await tx.get(counterRef);
      const count = counterSnap.exists() ? counterSnap.data().count : 0;
      const newOrderNumber = count + 1;
      const newOrderRef = doc(collection(db, "Orders"));
      tx.set(newOrderRef, { ...order, orderNumber: newOrderNumber });
      tx.update(counterRef, { count: newOrderNumber });
      return newOrderRef;
    });

    localStorage.removeItem("daisyCart");
    localStorage.removeItem("activePromo");
    if (currentUser.uid) await clearFirestoreBasket(currentUser.uid);

    alert("Order placed! 🎉");
    window.location.href = "index.html";
  } catch (err) {
    console.error("Order error:", err);
    alert("Failed to place order.");
  }
}

// 💳 Stripe Checkout
async function handleStripeCheckout() {
  const cart = JSON.parse(localStorage.getItem("daisyCart")) || [];
  if (cart.length === 0) return alert("Your basket is empty!");

  try {
    const createCheckout = httpsCallable(functions, "createStripeCheckout");
    const result = await createCheckout({ items: cart });
    if (result.data?.url) {
      window.location.href = result.data.url;
    } else {
      alert("No Stripe URL returned.");
    }
  } catch (err) {
    console.error("Stripe error:", err);
    alert("Checkout failed.");
  }
}

// 📦 Init on load
document.addEventListener("DOMContentLoaded", () => {
  localStorage.removeItem("orderSubmitted");

  const applyBtn = document.getElementById("apply-promo-btn");
  if (applyBtn) applyBtn.addEventListener("click", applyPromoCode);

  restorePromoIfExists();

  const stripeBtn = document.getElementById("stripeCheckoutBtn");
  if (stripeBtn) stripeBtn.addEventListener("click", handleStripeCheckout);

  const checkoutForm = document.getElementById("checkout-form");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = checkoutForm.querySelector("button[type='submit']");
      btn.textContent = "Processing...";
      btn.disabled = true;
      const success = await submitOrder();
      if (!success) {
        btn.textContent = "Buy Now";
        btn.disabled = false;
      }
    });
  }
});

export { loadCurrentUser, submitOrder };
