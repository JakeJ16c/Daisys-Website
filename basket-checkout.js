// basket-checkout.js - Combined checkout functionality for the integrated basket page
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

// 🧾 Submit order to Firebase
async function submitOrder() {
  const cartKey = "daisyCart";
  const basket = JSON.parse(localStorage.getItem(cartKey)) || [];
  
  if (basket.length === 0) {
    alert("You have nothing in the basket to checkout!");
    return false;
  }

  // Make sure user data is fully loaded before proceeding
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
    status: "pending",
    createdAt: serverTimestamp()
  };

  console.log("Submitting order payload:", orderPayload);

  try {
    // Add the order to Firestore
    const orderRef = await addDoc(collection(db, "Orders"), orderPayload);
    console.log("Order placed successfully with ID:", orderRef.id);
    
    // Clear the cart
    localStorage.removeItem(cartKey);
    
    // Show success message
    alert("Order placed successfully! 🛒");
    
    // Redirect to home page
    window.location.href = "index.html";
    return true;
  } catch (err) {
    console.error("Error placing order:", err);
    alert("Failed to place order. Please try again.");
    return false;
  }
}

// Initialize checkout functionality
document.addEventListener("DOMContentLoaded", async () => {
  // Load user data
  await loadCurrentUser();
  
  // Pre-fill email field if user is logged in
  const emailField = document.getElementById("email");
  if (emailField && currentUser.email && currentUser.email !== "no@email.com") {
    emailField.value = currentUser.email;
  }
  
  // Handle checkout form submission
  const checkoutForm = document.getElementById("checkout-form");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      // Show loading state
      const submitButton = checkoutForm.querySelector('button[type="submit"]');
      const originalText = submitButton.textContent;
      submitButton.textContent = "Processing...";
      submitButton.disabled = true;
      
      // Submit order to Firebase
      const success = await submitOrder();
      
      // Reset button if failed
      if (!success) {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
      }
    });
  }
});

export { loadCurrentUser, submitOrder };
