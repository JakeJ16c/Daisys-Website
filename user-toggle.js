import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA6kN9-7dN9Ovq6BmWBBJwBhLXRW6INX4c",
  authDomain: "daisy-s-website.firebaseapp.com",
  projectId: "daisy-s-website",
  storageBucket: "daisy-s-website.appspot.com",
  messagingSenderId: "595443495060",
  appId: "1:595443495060:web:7bbdd1108ad336d55c8481",
  measurementId: "G-ST5CQ6PV41"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

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
    if (
      !dropdown.contains(e.target) &&
      !iconLink.contains(e.target)
    ) {
      dropdown.classList.add("hidden");
    }
  });

  onAuthStateChanged(auth, (user) => {
    dropdownContent.innerHTML = ""; // Clear existing content

    if (user) {
      const greeting = document.createElement("p");
      greeting.innerHTML = `👋 Hello<br><strong>${user.email}</strong>`;
      greeting.style.margin = "0 0 0.5rem";
      greeting.style.fontWeight = "600";

      const hr = document.createElement("hr");
      hr.style.margin = "0.5rem 0";

      const accountLink = document.createElement("a");
      accountLink.href = "account.html";
      accountLink.textContent = "My Account";
      accountLink.style.display = "block";
      accountLink.style.padding = "0.4rem 0.8rem";
      accountLink.style.borderRadius = "6px";
      accountLink.style.color = "#204ECF";
      accountLink.style.textDecoration = "none";

      const ordersLink = document.createElement("a");
      ordersLink.href = "orders.html";
      ordersLink.textContent = "My Orders";
      ordersLink.style.display = "block";
      ordersLink.style.padding = "0.4rem 0.8rem";
      ordersLink.style.borderRadius = "6px";
      ordersLink.style.color = "#204ECF";
      ordersLink.style.textDecoration = "none";

      const logoutBtn = document.createElement("button");
      logoutBtn.textContent = "Log Out";
      logoutBtn.id = "logout-btn";
      logoutBtn.style.marginTop = "0.5rem";
      logoutBtn.style.padding = "0.5rem 1rem";
      logoutBtn.style.backgroundColor = "#204ECF";
      logoutBtn.style.color = "white";
      logoutBtn.style.border = "none";
      logoutBtn.style.borderRadius = "6px";
      logoutBtn.style.cursor = "pointer";

      logoutBtn.addEventListener("click", () => {
        signOut(auth).then(() => window.location.reload());
      });

      dropdownContent.appendChild(greeting);
      dropdownContent.appendChild(hr);
      dropdownContent.appendChild(accountLink);
      dropdownContent.appendChild(ordersLink);
      dropdownContent.appendChild(logoutBtn);

    } else {
      const loginLink = document.createElement("a");
      loginLink.href = "login.html";
      loginLink.textContent = "Log In";
      loginLink.style.display = "block";
      loginLink.style.textAlign = "center";
      loginLink.style.backgroundColor = "#204ECF";
      loginLink.style.color = "white";
      loginLink.style.padding = "0.5rem 1rem";
      loginLink.style.borderRadius = "6px";
      loginLink.style.textDecoration = "none";
      dropdownContent.appendChild(loginLink);
    }
  });
});
