// products.js
import { db } from './firebase.js';
import { getDocs, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

const container = document.getElementById('product-grid');

// 🔁 Show loading spinner
container.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;

async function loadProducts() {
  const productCards = [];

  // Add custom pinned card (Personalised Design)
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
    <button class="btn" href="custom-design.html">Start Now</button>
  `;
  productCards.push(pinnedCard);

  // Load from Firestore
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

    const productCard = document.createElement("div");
    productCard.className = "product-card";
    productCard.setAttribute("data-id", doc.id);
    productCard.setAttribute("data-name", data.name);
    productCard.setAttribute("data-price", data.price);

    productCard.innerHTML = `
      <a href="product.html?id=${doc.id}" class="product-link">
        <div class="multi-image-wrapper">
          ${Array.isArray(data.images) && data.images.length > 1
            ? data.images.map((img, i) =>
                `<img src="${img}" alt="${data.name}" class="fade-img" style="opacity:${i === 0 ? 1 : 0};">`
              ).join('')
            : `<img src="${Array.isArray(data.images) ? data.images[0] : data.images}" alt="${data.name}" class="fade-img">`
          }
        </div>
        <h3>${data.name}</h3>
        <p>£${parseFloat(data.price).toFixed(2)}</p>
      </a>
      <button class="btn add-to-basket">Add to Basket</button>
    `;

    productCards.push(productCard);
  });

  // 🔁 Hide spinner and show all cards at once
  container.innerHTML = '';
  productCards.forEach(card => container.appendChild(card));
  document.querySelectorAll('.multi-image-wrapper').forEach(wrapper => {
    const images = wrapper.querySelectorAll('.fade-img');
    if (images.length <= 1) return;
  
    let i = 0;
    setInterval(() => {
      images[i].style.opacity = 0;
      i = (i + 1) % images.length;
      images[i].style.opacity = 1;
    }, 2500);
  });

}

loadProducts();

document.addEventListener("DOMContentLoaded", () => {
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
      if (typeof syncBasketToFirestore === "function") {
        syncBasketToFirestore(cart);
      }

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

// Optional: sort feature (unchanged, you can skip this if not needed)
document.addEventListener("DOMContentLoaded", function () {
  const sortButtons = document.querySelectorAll(".sort .dropdown button");
  const productGrid = document.getElementById("product-grid");

  function sortCards(order) {
    const cards = Array.from(productGrid.querySelectorAll(".product-card"));
    cards.sort((a, b) => {
      const priceA = parseFloat(a.getAttribute("data-price")) || 0;
      const priceB = parseFloat(b.getAttribute("data-price")) || 0;
      return order === "asc" ? priceA - priceB : priceB - priceA;
    });

    cards.forEach(card => productGrid.appendChild(card));
  }

  sortButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const label = btn.textContent.trim();
      if (label === "Lowest Price") sortCards("asc");
      if (label === "Highest Price") sortCards("desc");
    });
  });
});
