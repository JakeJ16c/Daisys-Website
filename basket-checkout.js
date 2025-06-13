// basket-checkout.js - Combined checkout functionality for the integrated basket page

import { db, auth } from './firebase.js';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  runTransaction,
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

// ✅ Submit order to Firebase with a sequential order number
async function submitOrder() {
  const cartKey = "daisyCart";
  const basket = JSON.parse(localStorage.getItem(cartKey)) || [];

  if (basket.length === 0) {
    alert("You have nothing in the basket to checkout!");
    return false;
  }

  await loadCurrentUser(); // ensure user info is ready

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
    createdAt: serverTimestamp()
    // orderNumber will be added below
  };

  try {
    // 🧮 Firestore transaction to assign unique, sequential order number
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

    // ✅ Clear basket & Redirect once order is placed
    localStorage.removeItem("daisyCart");
    alert("Order placed successfully! 🛒");
    window.location.href = "index.html";
    return true;

  } catch (err) {
    console.error("❌ Error placing order:", err);
    alert("Failed to place order. Please try again.");
    return false;
  }
}

// ✅ Init checkout on DOM ready
document.addEventListener("DOMContentLoaded", async () => {
  await loadCurrentUser();

  const emailField = document.getElementById("email");
  if (emailField && currentUser.email && currentUser.email !== "no@email.com") {
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
