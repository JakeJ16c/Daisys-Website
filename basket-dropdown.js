import { auth, db } from './firebase.js';
import {
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  collection
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import {
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

document.addEventListener("DOMContentLoaded", () => {
  const cartKey = "daisyCart";
  const basketPreview = document.getElementById("basket-preview");
  const cartIcon = document.querySelector(".cart-icon");

  // Sync cart to Firestore when logged in
  async function syncBasketToFirestore(cart) {
    const user = auth.currentUser;
    if (!user) return;

    const batchDeletes = await getDocs(collection(db, "users", user.uid, "Basket"));
    await Promise.all(batchDeletes.docs.map(doc => deleteDoc(doc.ref)));

    await Promise.all(
      cart.map(item => {
        return setDoc(doc(db, "users", user.uid, "Basket", item.id + (item.size || "")), {
          name: item.name,
          price: item.price,
          qty: item.qty,
          image: item.image || "",
          size: item.size || null
        });
      })
    );
  }
  window.syncBasketToFirestore = syncBasketToFirestore;

  // Load from Firestore -> set localStorage
  async function loadBasketFromFirestore(callback) {
    const user = auth.currentUser;
    if (!user) return;

    const snap = await getDocs(collection(db, "users", user.uid, "Basket"));
    const cart = [];
    snap.forEach(doc => cart.push({ id: doc.id.replace(/(S|M|L)?$/, ""), ...doc.data() }));

    localStorage.setItem(cartKey, JSON.stringify(cart));
    if (typeof callback === 'function') callback(false);
  }

  onAuthStateChanged(auth, user => {
    if (user) {
      loadBasketFromFirestore(updateBasketPreview);
    }
  });

  // Basket dropdown open/close animation
  const style = document.createElement("style");
  style.textContent = `
    #basket-preview {
      max-height: 0;
      opacity: 0;
      overflow: hidden;
      transition: max-height 0.4s ease, opacity 0.3s ease;
      transform-origin: top;
      pointer-events: none;
    }
    #basket-preview.show {
      max-height: 1000px;
      opacity: 1;
      pointer-events: auto;
      background-color: white;
    }
  `;
  document.head.appendChild(style);

  // Main render function for the dropdown
  function updateBasketPreview(keepVisible = false) {
    window.updateBasketPreview = updateBasketPreview;
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    basketPreview.innerHTML = "";

    basketPreview.style.width = "320px";
    basketPreview.style.padding = "1rem";
    basketPreview.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
    basketPreview.style.borderRadius = "12px";
    basketPreview.style.position = "fixed";
    basketPreview.style.top = "98px";
    basketPreview.style.right = "20px";
    basketPreview.style.zIndex = "1000";

    const header = document.createElement("h3");
    header.textContent = "Your Basket";
    header.style.textAlign = "center";
    header.style.marginBottom = "1rem";
    header.style.fontWeight = "bold";
    basketPreview.appendChild(header);

    const hr = document.createElement("hr");
    hr.style.margin = "0.5rem 0";
    basketPreview.appendChild(hr);

    if (cart.length === 0) {
      basketPreview.innerHTML += `
        <p style="text-align: center; margin-top: 1rem;">
          <em>Your basket is empty.</em>
        </p>
      `;
      if (keepVisible) basketPreview.classList.add("show");
      return;
    }

    let subtotal = 0;

    cart.forEach((item, index) => {
      subtotal += item.price * item.qty;

      const itemRow = document.createElement("div");
      itemRow.style.display = "flex";
      itemRow.style.justifyContent = "space-between";
      itemRow.style.alignItems = "center";
      itemRow.style.marginBottom = "1rem";

      const link = document.createElement("a");
      link.href = `product.html?id=${item.id}`;
      link.style.display = "flex";
      link.style.alignItems = "center";
      link.style.marginRight = "0.75rem";

      const img = document.createElement("img");
      img.src = item.image || "placeholder.jpg";
      img.alt = item.name;
      img.style.width = "60px";
      img.style.height = "60px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "8px";
      link.appendChild(img);

      const infoWrapper = document.createElement("div");
      infoWrapper.style.flex = "1";
      infoWrapper.style.display = "flex";
      infoWrapper.style.alignItems = "center";

      const nameQtyWrapper = document.createElement("div");
      nameQtyWrapper.style.display = "flex";
      nameQtyWrapper.style.flexDirection = "column";

      // Build product name and size badge safely
      const name = document.createElement("div");
      name.style.display = "flex";
      name.style.alignItems = "center";
      name.style.cursor = "pointer";
      name.style.marginBottom = "0.5rem";
      name.onclick = () => {
        window.location.href = `product.html?id=${item.id}`;
      };

      const nameText = document.createElement("strong");
      nameText.textContent = item.name;
      name.appendChild(nameText);

      if (item.size) {
        const sizeBadge = document.createElement("span");
        sizeBadge.textContent = item.size;
        sizeBadge.style.fontSize = "0.7rem";
        sizeBadge.style.background = "#eee";
        sizeBadge.style.padding = "2px 6px";
        sizeBadge.style.borderRadius = "6px";
        sizeBadge.style.marginLeft = "6px";
        sizeBadge.style.color = "#444";
        name.appendChild(sizeBadge);
      }

      // Quantity Controls
      const quantityControls = document.createElement("div");
      quantityControls.style.display = "flex";
      quantityControls.style.alignItems = "center";

      const minus = document.createElement("button");
      minus.textContent = "−";
      minus.style.padding = "0.25rem 0.5rem";
      minus.style.fontWeight = "bold";
      minus.style.cursor = "pointer";
      minus.addEventListener("click", (e) => {
        e.stopPropagation();
        if (item.qty > 1) {
          item.qty--;
        } else {
          cart.splice(index, 1);
        }
        localStorage.setItem(cartKey, JSON.stringify(cart));
        syncBasketToFirestore(cart);
        updateBasketPreview(true);
      });

      const qty = document.createElement("span");
      qty.textContent = item.qty;
      qty.style.margin = "0 0.5rem";

      const plus = document.createElement("button");
      plus.textContent = "+";
      plus.style.padding = "0.25rem 0.5rem";
      plus.style.fontWeight = "bold";
      plus.style.cursor = "pointer";
      plus.addEventListener("click", (e) => {
        e.stopPropagation();
        item.qty++;
        localStorage.setItem(cartKey, JSON.stringify(cart));
        syncBasketToFirestore(cart);
        updateBasketPreview(true);
      });

      quantityControls.appendChild(minus);
      quantityControls.appendChild(qty);
      quantityControls.appendChild(plus);

      nameQtyWrapper.appendChild(name);
      nameQtyWrapper.appendChild(quantityControls);
      infoWrapper.appendChild(link);
      infoWrapper.appendChild(nameQtyWrapper);

      const price = document.createElement("span");
      price.textContent = `£${(item.price * item.qty).toFixed(2)}`;
      price.style.fontWeight = "bold";
      price.style.marginLeft = "1rem";

      itemRow.appendChild(infoWrapper);
      itemRow.appendChild(price);
      basketPreview.appendChild(itemRow);
    });

    const subtotalEl = document.createElement("div");
    subtotalEl.textContent = `Subtotal: £${subtotal.toFixed(2)}`;
    subtotalEl.style.textAlign = "right";
    subtotalEl.style.fontWeight = "bold";
    subtotalEl.style.margin = "0.5rem 0 1rem 0";
    basketPreview.appendChild(subtotalEl);

    const buttonRow = document.createElement("div");
    buttonRow.style.display = "flex";
    buttonRow.style.gap = "1rem";
    buttonRow.style.justifyContent = "center";

    const viewBtn = document.createElement("button");
    viewBtn.textContent = "View Basket";
    Object.assign(viewBtn.style, {
      background: "#3F51B5",
      color: "white",
      border: "none",
      padding: "0.5rem 1rem",
      borderRadius: "6px",
      cursor: "pointer",
      flex: "1"
    });
    viewBtn.addEventListener("click", () => {
      window.location.href = "basket.html";
    });

    const checkoutBtn = document.createElement("button");
    checkoutBtn.textContent = "Checkout";
    Object.assign(checkoutBtn.style, {
      background: "#000",
      color: "white",
      border: "none",
      padding: "0.5rem 1rem",
      borderRadius: "6px",
      cursor: "pointer",
      flex: "1"
    });
    checkoutBtn.addEventListener("click", () => {
      window.location.href = "basket.html";
    });

    buttonRow.appendChild(viewBtn);
    buttonRow.appendChild(checkoutBtn);
    basketPreview.appendChild(buttonRow);

    if (keepVisible) {
      basketPreview.classList.add("show");
    } else {
      basketPreview.classList.remove("show");
    }
  }

  // Toggle behavior
  if (cartIcon && basketPreview) {
    cartIcon.addEventListener("click", (e) => {
      e.preventDefault();
      basketPreview.classList.toggle("show");
    });

    document.addEventListener("click", (event) => {
      if (
        !cartIcon.contains(event.target) &&
        !basketPreview.contains(event.target) &&
        !event.target.classList.contains("add-to-basket")
      ) {
        basketPreview.classList.remove("show");
      }
    });
  }

  updateBasketPreview(); // Initial render
});
