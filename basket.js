
// basket.js

document.addEventListener("DOMContentLoaded", () => {
  const cartKey = "daisyCart";
  const cartIcon = document.querySelector(".cart-icon");
  const basketPreview = document.getElementById("basket-preview");

  function updateBasketPreview() {
    const cart = JSON.parse(localStorage.getItem(cartKey)) || [];

    basketPreview.innerHTML = "<h3>Your Basket</h3>";

    if (cart.length === 0) {
      basketPreview.innerHTML += "<p><em>Your basket is empty.</em></p>";
      return;
    }

    let subtotal = 0;

    cart.forEach((item, index) => {
      const productTotal = item.price * item.qty;
      subtotal += productTotal;

      const productRow = document.createElement("div");
      productRow.classList.add("basket-item");
      productRow.innerHTML = `
        <img src="${item.image}" alt="${item.name}">
        <div class="basket-item-details">
          <strong>${item.name}</strong>
          <div class="qty-controls">
            <button class="qty-decrease" data-index="${index}">−</button>
            <span>${item.qty}</span>
            <button class="qty-increase" data-index="${index}">+</button>
          </div>
        </div>
        <span class="basket-price">£${productTotal.toFixed(2)}</span>
      `;

      basketPreview.appendChild(productRow);
    });

    const subtotalRow = document.createElement("div");
    subtotalRow.classList.add("basket-subtotal");
    subtotalRow.innerHTML = `<strong>Subtotal: £${subtotal.toFixed(2)}</strong>`;
    basketPreview.appendChild(subtotalRow);

    const actions = document.createElement("div");
    actions.classList.add("basket-actions");
    actions.innerHTML = `
      <button class="view-basket">View Basket</button>
      <button class="checkout">Checkout</button>
    `;
    basketPreview.appendChild(actions);
  }

  // Listen for click on any Add to Basket button
  document.querySelectorAll(".add-to-basket").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const product = e.target.closest(".product-card");
      const id = product.dataset.id;
      const name = product.dataset.name;
      const price = parseFloat(product.dataset.price);
      const image = product.querySelector("img").getAttribute("src");

      let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
      const existing = cart.find((item) => item.id === id);

      if (existing) {
        existing.qty += 1;
      } else {
        cart.push({ id, name, price, qty: 1, image });
      }

      localStorage.setItem(cartKey, JSON.stringify(cart));
      updateBasketPreview();
      basketPreview.classList.remove("hidden");
    });
  });

  // Keep basket open on quantity control
  basketPreview.addEventListener("click", (e) => {
    let cart = JSON.parse(localStorage.getItem(cartKey)) || [];

    if (e.target.classList.contains("qty-increase")) {
      const index = parseInt(e.target.dataset.index);
      cart[index].qty += 1;
    }

    if (e.target.classList.contains("qty-decrease")) {
      const index = parseInt(e.target.dataset.index);
      if (cart[index].qty > 1) {
        cart[index].qty -= 1;
      }
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));
    updateBasketPreview();
  });

  if (cartIcon) {
    cartIcon.addEventListener("click", () => {
      basketPreview.classList.toggle("hidden");
    });
  }

  updateBasketPreview();
});
