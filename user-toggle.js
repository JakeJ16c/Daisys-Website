import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const iconLink = document.getElementById("auth-icon");
  const dropdown = document.getElementById("logout-dropdown");
  const dropdownContent = document.getElementById("user-dropdown-content");

  if (!iconLink || !dropdown || !dropdownContent) return;

  iconLink.addEventListener("click", (e) => {
    e.preventDefault();
    dropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && !iconLink.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });

  onAuthStateChanged(auth, async (user) => {
    dropdownContent.innerHTML = "";

    if (user) {
      // Greeting
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      const data = docSnap.exists() ? docSnap.data() : {};
      const greeting = document.createElement("p");
      greeting.innerHTML = `👋 Hello ${data.firstName}`;
      greeting.style.margin = "0 0 0.5rem";
      greeting.style.fontWeight = "600";
      greeting.style.textAlign = "center";
      greeting.style.fontSize = "0.9rem";
      greeting.style.fontFamily = "Fredoka";

      // Divider
      const hr = document.createElement("hr");
      hr.style.margin = "0.5rem 0";

      // Account link
      const accountLink = document.createElement("a");
      accountLink.href = "account.html";
      accountLink.textContent = "My Account";
      accountLink.style.display = "block";
      accountLink.style.padding = "0.4rem 0.8rem";
      accountLink.style.marginBottom = "0.3rem";
      accountLink.style.borderRadius = "6px";
      accountLink.style.color = "#204ECF";
      accountLink.style.textDecoration = "none";
      accountLink.style.fontWeight = "500";
      accountLink.style.textAlign = "center";
      accountLink.style.transition = "background 0.2s";

      // Wishlist link
      const wishlistLink = document.createElement("a");
      wishlistLink.href = "wishlist.html";
      wishlistLink.textContent = "My Wishlist";
      wishlistLink.style.display = "block";
      wishlistLink.style.padding = "0.4rem 0.8rem";
      wishlistLink.style.marginBottom = "0.3rem";
      wishlistLink.style.borderRadius = "6px";
      wishlistLink.style.color = "#204ECF";
      wishlistLink.style.textDecoration = "none";
      wishlistLink.style.fontWeight = "500";
      wishlistLink.style.textAlign = "center";
      wishlistLink.style.transition = "background 0.2s";      

      // Orders link
      const ordersLink = document.createElement("a");
      ordersLink.href = "/order/index.html";
      ordersLink.textContent = "My Orders";
      ordersLink.style.display = "block";
      ordersLink.style.padding = "0.4rem 0.8rem";
      ordersLink.style.marginBottom = "0.3rem";
      ordersLink.style.borderRadius = "6px";
      ordersLink.style.color = "#204ECF";
      ordersLink.style.textDecoration = "none";
      ordersLink.style.fontWeight = "500";
      ordersLink.style.textAlign = "center";
      ordersLink.style.transition = "background 0.2s";

      // Log out button
      const logoutBtn = document.createElement("button");
      logoutBtn.textContent = "Log Out";
      logoutBtn.style.marginTop = "0.5rem";
      logoutBtn.style.padding = "0.5rem 1rem";
      logoutBtn.style.backgroundColor = "#204ECF";
      logoutBtn.style.color = "white";
      logoutBtn.style.border = "none";
      logoutBtn.style.borderRadius = "6px";
      logoutBtn.style.cursor = "pointer";
      logoutBtn.style.fontWeight = "600";
      logoutBtn.style.width = "100%";

      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("daisyCart");
        signOut(auth)
          .then(() => {
            window.location.replace("index.html");
          })
          .catch(err => {
            console.error("Logout failed:", err);
          });
      });

      dropdownContent.append(greeting, hr, wishlistLink, accountLink, ordersLink, logoutBtn);

    } else {
      const loginLink = document.createElement("a");
      loginLink.href = "login.html";
      loginLink.textContent = "Log In / Sign Up";
      loginLink.style.display = "block";
      loginLink.style.textAlign = "center";
      loginLink.style.backgroundColor = "#204ECF";
      loginLink.style.color = "white";
      loginLink.style.padding = "0.5rem 1rem";
      loginLink.style.borderRadius = "6px";
      loginLink.style.textDecoration = "none";
      loginLink.style.fontWeight = "600";

      dropdownContent.appendChild(loginLink);
    }
  });
});
