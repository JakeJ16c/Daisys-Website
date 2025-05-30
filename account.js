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
  getDocs,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const form = document.getElementById("profileform");
const greeting = document.getElementById("account-greeting");
const logoutButton = document.getElementById("logoutBtn");

onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.replace("login.html");

  const userDocRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    const userData = userDoc.data();

    form["first-name"].value = userData["first-name"] || "";
    form["last-name"].value = userData["last-name"] || "";
    form["house-number"].value = userData["house-number"] || "";
    form["street"].value = userData["street"] || "";
    form["city"].value = userData["city"] || "";
    form["county"].value = userData["county"] || "";
    form["postcode"].value = userData["postcode"] || "";

    greeting.innerHTML = `
      <i class="fas fa-user-circle"></i> Welcome back, ${userData["first-name"] || user.displayName || "Friend"}
    `;

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
    "house-number": form["house-number"].value,
    "street": form["street"].value,
    "city": form["city"].value,
    "county": form["county"].value,
    "postcode": form["postcode"].value,
    email: user.email
  };

  await setDoc(userDocRef, formData, { merge: true });
  alert("Account details updated!");
});

logoutButton.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

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
