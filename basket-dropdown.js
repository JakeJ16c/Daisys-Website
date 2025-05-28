document.addEventListener("DOMContentLoaded", () => {
  const cartKey = "daisyCart";
  const basketPreview = document.getElementById("basket-preview");
  const cartIcon = document.querySelector(".cart-icon");

  function updateBasketPreview(keepVisible = false) {
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    basketPreview.innerHTML = "";

    // Basket container styling
    basketPreview.style.width = "320px";
    basketPreview.style.padding = "1rem";
    basketPreview.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
    basketPreview.style.borderRadius = "12px";

    // Header
    const header = document.createElement("h3");
    header.textContent = "Your Basket";
    header.style.textAlign = "center";
    header.style.marginBottom = "1rem";
    header.style.fontWeight = "bold";
    basketPreview.appendChild(header);

    if (cart.length === 0) {
      basketPreview.innerHTML += "<p><em>Your basket is empty.</em></p>";
      return;
    }

    window.updateBasketPreview = updateBasketPreview;

    let subtotal = 0;

    cart.forEach((item, index) => {
      subtotal += item.price * item.qty;

      const itemRow = document.createElement("div");
      itemRow.style.display = "flex";
      itemRow.style.justifyContent = "space-between";
      itemRow.style.alignItems = "center";
      itemRow.style.marginBottom = "1rem";

      const img = document.createElement("img");
      img.src = item.image || "placeholder.jpg";
      img.alt = item.name;
      img.style.width = "60px";
      img.style.height = "60px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "8px";
      img.style.marginRight = "0.75rem";

      const infoWrapper = document.createElement("div");
      infoWrapper.style.flex = "1";
      infoWrapper.style.display = "flex";
      infoWrapper.style.alignItems = "center";

      const nameQtyWrapper = document.createElement("div");
      nameQtyWrapper.style.display = "flex";
      nameQtyWrapper.style.flexDirection = "column";

      const name = document.createElement("strong");
      name.textContent = item.name;
      name.style.marginBottom = "0.5rem";

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
        basketPreview.classList.remove("hidden");
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
        basketPreview.classList.remove("hidden");
        updateBasketPreview(true);
      });

      quantityControls.appendChild(minus);
      quantityControls.appendChild(qty);
      quantityControls.appendChild(plus);

      nameQtyWrapper.appendChild(name);
      nameQtyWrapper.appendChild(quantityControls);
      infoWrapper.appendChild(img);
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
      window.location.href = "checkout.html";
    });

    buttonRow.appendChild(viewBtn);
    buttonRow.appendChild(checkoutBtn);
    basketPreview.appendChild(buttonRow);

    if (keepVisible) basketPreview.classList.remove("hidden");
  }

  document.addEventListener("click", (e) => {
  if (e.target && e.target.classList.contains("add-to-basket")) {
    const product = e.target.closest(".product-card");
    const id = product.dataset.id;
    const name = product.dataset.name;
    const price = parseFloat(product.dataset.price);
    const image = product.querySelector("img")?.src || "placeholder.jpg";

    let cart = JSON.parse(localStorage.getItem("daisyCart")) || [];
    const existing = cart.find((item) => item.id === id);

    if (existing) {
      existing.qty++;
    } else {
      cart.push({ id, name, price, qty: 1, image });
    }

    localStorage.setItem("daisyCart", JSON.stringify(cart));
    document.getElementById("basket-preview").classList.remove("hidden");
    updateBasketPreview(true);
  }
});

  if (cartIcon && basketPreview) {
    cartIcon.addEventListener("click", (e) => {
      e.preventDefault();
      basketPreview.classList.toggle("hidden");
    });

    document.addEventListener("click", (event) => {
      if (
        !cartIcon.contains(event.target) &&
        !basketPreview.contains(event.target) &&
        !event.target.classList.contains("add-to-basket")
      ) {
        basketPreview.classList.add("hidden");
      }
      
    });
  }

  updateBasketPreview(); // Load on page ready
});
