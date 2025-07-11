import { auth, db } from './firebase.js';
import { doc, setDoc, getDocs, deleteDoc,collection } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

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
      itemRow.style.alignItems = "flex-start";
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
      infoWrapper.style.display = "flex";
      infoWrapper.style.alignItems = "flex-start"; // 👈 aligns name block with top of image
      infoWrapper.style.justifyContent = "space-between";
      infoWrapper.style.flex = "1";
      infoWrapper.style.gap = "10px";
    
      // Product info container (name and size)
      const productInfo = document.createElement("div");
      productInfo.style.display = "flex";
      productInfo.style.flexDirection = "column";
      productInfo.style.maxWidth = "100px"; // Limit width for long product names
      productInfo.style.flex = "1"; // Allows it to wrap naturally
      productInfo.style.wordBreak = "break-word"; // Break long names cleanly     
      
      const name = document.createElement("strong");
      name.textContent = item.name;
      name.style.cursor = "pointer";
      name.style.wordWrap = "break-word";
      name.style.lineHeight = "1.2";
      name.style.fontSize = "0.9rem"; // Slightly smaller font for product name
      name.onclick = () => {
        window.location.href = `product.html?id=${item.id}`;
      };
      productInfo.appendChild(name);
      
      // Size info now goes below the product name
      const sizeInfo = document.createElement("div");
      sizeInfo.style.fontSize = "0.8rem";
      sizeInfo.style.color = "#666";
      sizeInfo.style.marginTop = "9px";
      
      if (item.size && item.size.toLowerCase() !== "onesize") {
        sizeInfo.textContent = "Size: ";
        const sizeBadge = document.createElement("span");
        sizeBadge.textContent = item.size;
        sizeBadge.style.fontSize = "0.7rem";
        sizeBadge.style.background = "#eee";
        sizeBadge.style.padding = "2px 6px";
        sizeBadge.style.borderRadius = "6px";
        sizeBadge.style.color = "#444";
        sizeInfo.appendChild(sizeBadge);
      }
      productInfo.appendChild(sizeInfo);
      
      // 🔁 Clean pill-style quantity controls
      const quantityControls = document.createElement("div");
      quantityControls.style.display = "inline-flex";
      quantityControls.style.alignItems = "center";
      quantityControls.style.gap = "2px";
      quantityControls.style.border = "1.75px solid black";
      quantityControls.style.borderRadius = "6px";
      quantityControls.style.fontFamily = "'Nunito Sans', sans-serif";
      quantityControls.style.fontSize = "0.75rem";
      quantityControls.style.fontWeight = "600";
      quantityControls.style.backgroundColor = "#fff";
      
      const minus = document.createElement("button");
      minus.textContent = "−";
      minus.style.border = "none";
      minus.style.background = "none";
      minus.style.fontSize = "0.8rem";
      minus.style.cursor = "pointer";
      minus.style.fontWeight = "bold";
      minus.style.padding = "3px 10px";
      minus.style.borderTopLeftRadius = "4px";
      minus.style.borderBottomLeftRadius = "4px";
      minus.style.transition = "transform 0.2s ease";
      minus.onmouseover = () => minus.style.transform = "scale(1.2)";
      minus.onmouseover = () => minus.style.background = "#FBB6C1";
      minus.onmouseout = () => minus.style.transform = "scale(1)";
      minus.onmouseout = () => minus.style.background = "none";
      minus.addEventListener("click", (e) => {
      e.stopPropagation();
    
      if (item.qty > 1) {
        item.qty--;
        localStorage.setItem(cartKey, JSON.stringify(cart));
        syncBasketToFirestore(cart);
    
        // ✅ Safe to update DOM
        qty.textContent = item.qty;
        price.textContent = `£${(item.price * item.qty).toFixed(2)}`;
      } else {
        // ✅ Remove item, then re-render just once
        cart.splice(index, 1);
        localStorage.setItem(cartKey, JSON.stringify(cart));
        syncBasketToFirestore(cart);
    
        updateBasketPreview(true); // Full rerender for item removal only
        return;
      }
    
      // ✅ Update subtotal (even if one item was removed)
      const newSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
      document.querySelector("#basket-preview").querySelector("div:last-of-type").previousSibling.textContent = `Subtotal: £${newSubtotal.toFixed(2)}`;
    });
      
      const qty = document.createElement("span");
      qty.textContent = item.qty;
      qty.style.minWidth = "16px";
      qty.style.textAlign = "center";
      
      const plus = document.createElement("button");
      plus.textContent = "+";
      plus.style.border = "none";
      plus.style.background = "none";
      plus.style.fontSize = "0.8rem";
      plus.style.cursor = "pointer";
      plus.style.fontWeight = "bold";
      plus.style.padding = "3px 10px";
      plus.style.borderTopRightRadius = "4px";
      plus.style.borderBottomRightRadius = "4px";
      plus.style.transition = "transform 0.2s ease";
      plus.onmouseover = () => plus.style.transform = "scale(1.2)";
      plus.onmouseover = () => plus.style.background = "#CCE0FF";
      plus.onmouseout = () => plus.style.transform = "scale(1)";
      plus.onmouseout = () => plus.style.background = "none";
      plus.addEventListener("click", (e) => {
        e.stopPropagation();
        item.qty++;
        localStorage.setItem(cartKey, JSON.stringify(cart));
        syncBasketToFirestore(cart);
        
        // Just update the DOM without full rerender
        qty.textContent = item.qty;
        price.textContent = `£${(item.price * item.qty).toFixed(2)}`;
        
        // Update subtotal
        const newSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        document.querySelector("#basket-preview").querySelector("div:last-of-type").previousSibling.textContent = `Subtotal: £${newSubtotal.toFixed(2)}`;
      });
      
      quantityControls.appendChild(minus);
      quantityControls.appendChild(qty);
      quantityControls.appendChild(plus);
      
      // Price element
      const price = document.createElement("span");
      price.textContent = `£${(item.price * item.qty).toFixed(2)}`;
      price.style.fontWeight = "bold";
      price.style.fontSize = "0.9rem"; // Slightly smaller font for price
      price.style.whiteSpace = "nowrap"; // Prevent price from wrapping
      price.style.width = "60px"; // 👈 fixed width
      price.style.textAlign = "right"; // optional: aligns price inside its box
      
      // Add elements to their containers
      const rightSide = document.createElement("div");
      rightSide.style.display = "flex";
      rightSide.style.alignItems = "center"; // ✅ centers vertically
      rightSide.style.gap = "2px";
      rightSide.style.marginTop = "20px";
      rightSide.appendChild(quantityControls);
      rightSide.appendChild(price);
      
      infoWrapper.appendChild(productInfo);
      infoWrapper.appendChild(rightSide);
      
      itemRow.appendChild(link);
      itemRow.appendChild(infoWrapper);
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
