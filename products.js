// products.js
import { db } from './firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

const container = document.getElementById('product-grid');

async function loadProducts() {
  const querySnapshot = await getDocs(collection(db, "Products"));

  if (querySnapshot.empty) {
    container.innerHTML = `
      <p class="no-products">
        <strong>Sorry, we’re currently out of stock!</strong><br/>
        We’re busy restocking—follow us on 
        <a href="https://instagram.com/shop.youre.so.golden">Instagram</a> 
        or 
        <a href="">Facebook</a> 
        to catch the next drop. ✨
      </p>
    `;
    return;
  }

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    console.log("📦 Product data:", data);

    const productCard = document.createElement("div");
    productCard.className = "product-card";
    productCard.setAttribute("data-id", doc.id);
    productCard.setAttribute("data-name", data.name);
    productCard.setAttribute("data-price", data.price);

    productCard.innerHTML = `
      <img src="${data.image}" alt="${data.name}" />
      <h3>${data.name}</h3>
      <p>£${parseFloat(data.price).toFixed(2)}</p>
      <button class="btn add-to-basket">Add to Basket</button>
    `;

    container.appendChild(productCard);
  });
}

loadProducts();
console.log("Connected to Firestore");

// ✅ Global listener: handles all future .add-to-basket clicks
document.addEventListener("click", (e) => {
  if (e.target && e.target.classList.contains("add-to-basket")) {
    const product = e.target.closest(".product-card");
    const id = product.dataset.id;
    const name = product.dataset.name;
    const price = parseFloat(product.dataset.price);
    const image = product.querySelector("img")?.src || "placeholder.jpg";

    const cartKey = "daisyCart";
    let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
    const existing = cart.find((item) => item.id === id);

    if (existing) {
      existing.qty++;
    } else {
      cart.push({ id, name, price, qty: 1, image });
    }

    localStorage.setItem(cartKey, JSON.stringify(cart));
    document.getElementById("basket-preview")?.classList.remove("hidden");
    if (typeof updateBasketPreview === "function") {
      updateBasketPreview(true);
  }
  }
});
