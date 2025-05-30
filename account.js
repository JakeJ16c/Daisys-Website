import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { app } from "./firebase.js";

const auth = getAuth(app);
const db = getFirestore(app);

const form = document.getElementById("profileform");
const greeting = document.getElementById("account-greeting");
const logoutButton = document.getElementById("logout-btn");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    return window.location.replace("login.html");
  }

  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    const userData = userDoc.data();

    form["first-name"].value = userData["first-name"] || "";
    form["last-name"].value = userData["last-name"] || "";
    form["email"].value = userData.email || user.email;
    form["address-line1"].value = userData["address-line1"] || "";
    form["address-line2"].value = userData["address-line2"] || "";
    form["city"].value = userData["city"] || "";
    form["postcode"].value = userData["postcode"] || "";

    greeting.innerHTML = `
      <i class="fas fa-user-circle"></i> Welcome back, ${userData["first-name"] || user.displayName || "Friend"}
    `;

    // ✅ Load orders once profile is loaded
    await loadUserOrders(user.uid);

  } else {
    greeting.innerHTML = `<i class="fas fa-user-circle"></i> Welcome back, ${user.displayName || "Friend"}`;
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  const formData = {
    "first-name": form["first-name"].value,
    "last-name": form["last-name"].value,
    email: form["email"].value,
    "address-line1": form["address-line1"].value,
    "address-line2": form["address-line2"].value,
    city: form["city"].value,
    postcode: form["postcode"].value,
  };

  await setDoc(userDocRef, formData, { merge: true });
  alert("Account details updated!");
});

// 🔐 Logout button
logoutButton.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// 📦 Load current user's orders
async function loadUserOrders(userId) {
  const ordersContainer = document.getElementById("user-orders");
  ordersContainer.innerHTML = "<p>Loading your orders...</p>";

  try {
    const q = query(collection(db, "Orders"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      ordersContainer.innerHTML = "<p>You have no orders yet.</p>";
      return;
    }

    let html = "";
    querySnapshot.forEach((doc) => {
      const order = doc.data();
      const date = order.createdAt?.toDate().toLocaleString() || "Unknown date";

      html += `
        <div class="order-card">
          <h4>Order - ${date}</h4>
          <ul>
            ${order.items.map(item => `
              <li>${item.productName} × ${item.qty} – £${item.price.toFixed(2)}</li>
            `).join("")}
          </ul>
          <p>Status: <strong>${order.status}</strong></p>
        </div>
      `;
    });

    ordersContainer.innerHTML = html;

  } catch (error) {
    console.error("Failed to load orders:", error);
    ordersContainer.innerHTML = "<p>There was an error loading your orders.</p>";
  }
}
