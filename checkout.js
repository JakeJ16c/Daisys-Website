import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

export async function submitOrder() {
  const nameInput  = document.getElementById("cust-name");
  const emailInput = document.getElementById("cust-email");
  const name       = nameInput?.value.trim();
  const email      = emailInput?.value.trim();
  const basket     = JSON.parse(localStorage.getItem("daisyCart")) || [];

  if (basket.length === 0) {
    alert("You have nothing in the basket to checkout!");
    return;
  }

  try {
    await addDoc(collection(db, "Orders"), {
      name,
      email,
      items: basket.map(item => ({
        productId:   item.id,
        productName: item.name,
        qty:         item.qty,
        price:       item.price
      })),
      Status:    "pending",
      createdAt: serverTimestamp()
    });

    alert("Order placed successfully! 🎉");
    localStorage.removeItem("daisyCart");
    window.location.href = "index";
  } catch (err) {
    console.error("Error placing order:", err);
    alert("Failed to place order. Please try again.");
  }
}
