// basket-checkout.js – Handles checkout logic, promo codes, Firestore order saving, and Stripe integration
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

// ✅ Update promo and total values in the summary section
function updateSummaryUI(subtotal, discount, final) {
  const discountLine = document.getElementById("discount-line");
  const finalTotalLine = document.getElementById("final-total-line");

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

let currentUser = {
  name: "Anonymous",
  email: "no@email.com",
  address: {}
};

// ✅ Load current user's profile and address if signed in
async function loadCurrentUser() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            const address = data.address || {};

            currentUser = {
              uid: user.uid,
              name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || user.displayName || "Customer",
              email: user.email || "no@email.com",
              address: address
            };

            resolve();
          } else {
            console.warn("User document not found.");
            resolve();
          }
        } catch (err) {
          console.error("Error loading user:", err);
          reject(err);
        }
      } else {
        console.warn("No user authenticated");
        resolve(); // allow guest checkout
      }
    });
  });
}

// ✅ Clear user's Firestore basket after order
async function clearFirestoreBasket(userId) {
  const basketRef = collection(db, `users/${userId}/Basket`);
  const snap = await getDocs(basketRef);

  const deletions = snap.docs.map(docSnap =>
    deleteDoc(doc(db, `users/${userId}/Basket/${docSnap.id}`))
  );

  await Promise.all(deletions);
  console.log("✅ Firestore basket cleared.");
}

// ✅ Apply promo logic based on Firestore promo data
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

        const basket = JSON.parse(localStorage.getItem("daisyCart")) || [];
        const subtotal = basket.reduce((acc, item) => acc + (item.price * item.qty), 0);

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

// ✅ Firestore Order placement logic
async function submitOrder() {
  const cartKey = "daisyCart";
  const basket = JSON.parse(localStorage.getItem(cartKey)) || [];
  if (basket.length === 0) return alert("You have nothing in the basket to checkout!");

  await loadCurrentUser();
  const subtotal = basket.reduce((acc, item) => acc + (item.price * item.qty), 0);

  discountAmount = activePromo
    ? (activePromo.type === "percentage"
        ? subtotal * (activePromo.discount / 100)
        : activePromo.discount)
    : 0;

  finalTotal = Math.max(0, subtotal - discountAmount);

  const orderPayload = {
    userId: currentUser.uid || "guest",
    name: currentUser.name || "Anonymous",
    email: currentUser.email || document.getElementById("email").value || "no@email.com",
    address: currentUser.address || {},
    items: basket.map(item => ({
      productId: item.id || "unknown",
      productName: item.name || "Unnamed",
      qty: parseInt(item.qty) || 1,
      price: parseFloat(item.price) || 0,
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

    const orderRef = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      const currentCount = counterSnap.exists() ? counterSnap.data().count : 0;
      const newOrderNumber = currentCount + 1;

      const newOrderRef = doc(collection(db, "Orders"));
      transaction.set(newOrderRef, {
        ...orderPayload,
        orderNumber: newOrderNumber
      });

      transaction.update(counterRef, { count: newOrderNumber });
      return newOrderRef;
    });

    console.log("✅ Order placed with ID:", orderRef.id);

    localStorage.removeItem(cartKey);
    if (currentUser.uid) await clearFirestoreBasket(currentUser.uid);

    alert("Order placed successfully! 🛒");
    window.location.href = "index.html";
    return true;
  } catch (err) {
    console.error("❌ Error placing order:", err);
    alert("Failed to place order. Please try again.");
    return false;
  }
}

// ✅ New: Trigger Stripe checkout
async function handleStripeCheckout() {
  const cart = JSON.parse(localStorage.getItem("daisyCart")) || [];

  if (cart.length === 0) {
    alert("Your basket is empty.");
    return;
  }

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

// ✅ On DOM load – wire up buttons and autofill
document.addEventListener("DOMContentLoaded", async () => {
  // 🔄 Reset Stripe submission flag when user reopens basket
  localStorage.removeItem("orderSubmitted");
  await loadCurrentUser();

  const applyBtn = document.getElementById("apply-promo-btn");
  if (applyBtn) applyBtn.addEventListener("click", applyPromoCode);

  const emailField = document.getElementById("email");
  if (emailField && currentUser.email !== "no@email.com") {
    emailField.value = currentUser.email;
  }

  const checkoutForm = document.getElementById("checkout-form");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitButton = checkoutForm.querySelector('button[type="submit"]');
      const originalText = submitButton.textContent;
      submitButton.textContent = "Processing...";
      submitButton.disabled = true;

      const success = await submitOrder();

      if (!success) {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
      }
    });
  }

  // ✅ Stripe Checkout button wiring
  const stripeBtn = document.getElementById("stripeCheckoutBtn");
  if (stripeBtn) {
    stripeBtn.addEventListener("click", handleStripeCheckout);
  }
});

export { loadCurrentUser, submitOrder };
