// ✅ Wait for the DOM to fully load before running any code
document.addEventListener("DOMContentLoaded", () => {
  // ✅ Import Firebase modules
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

  let currentUser = null;

  // ✅ Load user profile data from Firestore
  async function loadUserProfile(user) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      document.getElementById("first-name").value = data.firstName || "";
      document.getElementById("last-name").value = data.lastName || "";
      document.getElementById("house-number").value = data.address?.houseNumber || "";
      document.getElementById("street").value = data.address?.street || "";
      document.getElementById("city").value = data.address?.city || "";
      document.getElementById("county").value = data.address?.county || "";
      document.getElementById("postcode").value = data.address?.postcode || "";
    }
  }

  // ✅ Load user's orders from Firestore
  async function loadUserOrders(user) {
    const ordersRef = collection(db, "Orders");
    const q = query(ordersRef, where("userId", "==", user.uid));
    const querySnapshot = await getDocs(q);

    const ordersDiv = document.querySelector(".form-container:nth-of-type(2)");
    ordersDiv.innerHTML = "<h3><i class='fas fa-box'></i> My Orders</h3>";

    if (querySnapshot.empty) {
      ordersDiv.innerHTML += "<p>No orders found.</p>";
      return;
    }

    querySnapshot.forEach(docSnap => {
      const order = docSnap.data();
      const orderHTML = `
        <div class="order">
          <p><strong>Order ID:</strong> ${docSnap.id}</p>
          <p><strong>Status:</strong> ${order.status}</p>
          <p><strong>Placed:</strong> ${new Date(order.createdAt.seconds * 1000).toLocaleDateString()}</p>
          <ul>
            ${order.items.map(item => `<li>${item.productName} x${item.qty} - £${item.price.toFixed(2)}</li>`).join("")}
          </ul>
        </div>
      `;
      ordersDiv.innerHTML += orderHTML;
    });
  }

  // ✅ Handle profile save button
  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!currentUser) return;

      const profile = {
        firstName: document.getElementById("first-name").value,
        lastName: document.getElementById("last-name").value,
        address: {
          houseNumber: document.getElementById("house-number").value,
          street: document.getElementById("street").value,
          city: document.getElementById("city").value,
          county: document.getElementById("county").value,
          postcode: document.getElementById("postcode").value,
        },
      };

      const userRef = doc(db, "users", currentUser.uid);
      await setDoc(userRef, profile, { merge: true });
      alert("Profile saved!");
    });
  }

  // ✅ Handle logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      signOut(auth).then(() => {
        window.location.href = "index.html";
      });
    });
  }

  // ✅ Monitor auth state and load data
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      loadUserProfile(user);
      loadUserOrders(user);
    } else {
      alert("You must be logged in to view your account.");
      window.location.href = "login.html";
    }
  });
});
