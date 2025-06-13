// basket-checkout.js – Handles checkout logic, promo codes, Firestore order saving and basket clearing

import { db, auth } from './firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  runTransaction,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

let activePromo = null;
let discountAmount = 0;
let finalTotal = 0;

// ✅ UI updater for promo display in order summary
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

// ✅ Load user data including delivery address
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

// ✅ Clear Firestore basket for multi-device consistency
async function clearFirestoreBasket(userId) {
  const basketRef = collection(db, `users/${userId}/Basket`);
  const snap = await getDocs(basketRef);

  const deletions = snap.docs.map(docSnap =>
    deleteDoc(doc(db, `users/${userId}/Basket/${docSnap.id}`))
  );

  await Promise.all(deletions);
  console.log("✅ Firestore basket cleared.");
}

// ✅ Apply promo code and calculate discount
async function applyPromoCode() {
  const codeInput = document.getElementById("promo-code-input");
  const summaryTotal = document.getElementById("summary-total");

  const code = codeInput.value.trim().toUpperCase();
  if (!code) return alert("Enter a promo code.");

  try {
    const snap = await getDocs(collection(db, "PromoCodes"));
    let found = false;

    snap.forEach(doc => {
      const promo = doc.data();
      if (promo.code.toUpperCase() === code) {
        found = true;
        activePromo = { ...promo, code }; // Make sure promo.code is available

        const basket = JSON.parse(localStorage.getItem("daisyCart")) || [];
        const subtotal = basket.reduce((acc, item) => acc + (item.price * item.qty), 0);

        if (subtotal < (promo.minSpend || 0)) {
          return alert(`Minimum spend for this promo is £${promo.minSpend}`);
        }

        if (promo.type === "percentage") {
          discountAmount = subtotal * (promo.discount / 100);
        } else {
          discountAmount = promo.discount;
        }

        finalTotal = Math.max(0, subtotal - discountAmount);

        updateSummaryUI(subtotal, discountAmount, finalTotal);
        alert("Promo code applied!");
      }
    });

    if (!found) {
      alert("Promo code not found.");
    }

  } catch (err) {
    console.error("Error applying promo:", err);
    alert("Something went wrong applying the code.");
  }
}

// ✅ Place order, generate order number, and clear local + Firestore basket
async function submitOrder() {
  const cartKey = "daisyCart";
  const basket = JSON.parse(localStorage.getItem(cartKey)) || [];

  if (basket.length === 0) {
    alert("You have nothing in the basket to checkout!");
    return false;
  }

  await loadCurrentUser();

  const subtotal = basket.reduce((acc, item) => acc + (item.price * item.qty), 0);

  if (activePromo) {
    if (activePromo.type === "percentage") {
      discountAmount = subtotal * (activePromo.discount / 100);
    } else {
      discountAmount = activePromo.discount;
    }
    finalTotal = Math.max(0, subtotal - discountAmount);
  } else {
    discountAmount = 0;
    finalTotal = subtotal;
  }

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

    // ✅ Clear cart in both localStorage and Firestore
    localStorage.removeItem(cartKey);

    if (currentUser.uid) {
      await clearFirestoreBasket(currentUser.uid);
    }

    alert("Order placed successfully! 🛒");
    window.location.href = "index.html";
    return true;

  } catch (err) {
    console.error("❌ Error placing order:", err);
    alert("Failed to place order. Please try again.");
    return false;
  }
}

// ✅ On DOM ready: link events and auto-fill email if logged in
document.addEventListener("DOMContentLoaded", async () => {
  await loadCurrentUser();

  const applyBtn = document.getElementById("apply-promo-btn");
  if (applyBtn) {
    applyBtn.addEventListener("click", applyPromoCode);
  }

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
});

export { loadCurrentUser, submitOrder };
