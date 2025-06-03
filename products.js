// products.js
import { db } from './firebase.js';
import { getDocs, getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

const container = document.getElementById('product-grid');

async function loadProducts() {

// 🔖 Add custom pinned card first
const pinnedCard = document.createElement("div");
pinnedCard.className = "product-card pinned-card";
pinnedCard.setAttribute("data-id", "custom-design");
pinnedCard.setAttribute("data-name", "Your Personalised Design");
pinnedCard.setAttribute("data-price", "30");

pinnedCard.innerHTML = `
  <a href="custom-design.html" class="product-link">
    <img src="IMG_8861.png" alt="Your Personalised Design" />
    <h3>Your Personalised Design</h3>
    <p>Want something unique? Send us your idea and we’ll make it real!</p>
    <p class="price">From £30</p>
  </a>
  <button class="btn add-to-basket">Start Now</button>
`;

container.appendChild(pinnedCard); // This goes at the top before all products
  
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
    <a href="product.html?id=${doc.id}" class="product-link">
    <img src="${Array.isArray(data.images) ? data.images[0] : data.images}" alt="${data.name}" />
    <h3>${data.name}</h3>
    <p>£${parseFloat(data.price).toFixed(2)}</p>
  </a>
  <button class="btn add-to-basket">Add to Basket</button>
`;


    container.appendChild(productCard);
  });
}

loadProducts();
console.log("Connected to Firestore");

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("click", (e) => {
    if (e.target && e.target.classList.contains("add-to-basket")) {
      const product = e.target.closest(".product-card");
      console.log("🛒 Add to basket clicked", product);
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
      logBasketActivity({ id, name, qty: 1 });
      document.getElementById("basket-preview")?.classList.remove("hidden");
      if (typeof updateBasketPreview === "function") {
        updateBasketPreview(true);
      }
    }
  });
});

async function logBasketActivity(product) {
  try {
    await addDoc(collection(db, "BasketUpdates"), {
      name: product.name,
      productId: product.id,
      qty: product.qty || 1,
      timestamp: serverTimestamp()
    });
    console.log("📤 Basket activity logged.");
  } catch (err) {
    console.error("❌ Error logging basket activity:", err);
  }
}
