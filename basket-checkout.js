// basket-checkout.js - Combined checkout functionality for the integrated basket page

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

let currentUser = {
  name: "Anonymous",
  email: "no@email.com",
  address: {}
};

// ✅ Load user info and address
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

// ✅ Firestore Basket Clearer (multi-device support)
async function clearFirestoreBasket(userId) {
  const basketRef = collection(db, `users/${userId}/Basket`);
  const snap = await getDocs(basketRef);

  const deletions = snap.docs.map(docSnap =>
    deleteDoc(doc(db, `users/${userId}/Basket/${docSnap.id}`))
  );

  await Promise.all(deletions);
  console.log("✅ Firestore basket cleared.");
}

// ✅ Place Order with sequential ID and clear cart
async function submitOrder() {
  const cartKey = "daisyCart";
  const basket = JSON.parse(localStorage.getItem(cartKey)) || [];

  if (basket.length === 0) {
    alert("You have nothing in the basket to checkout!");
    return false;
  }

  await loadCurrentUser();

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

    // ✅ Clear localStorage cart and Firestore basket
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

// ✅ DOM Ready
document.addEventListener("DOMContentLoaded", async () => {
  await loadCurrentUser();

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
