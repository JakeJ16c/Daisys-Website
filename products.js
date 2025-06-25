// products.js
import { db } from './firebase.js';
import { getDocs, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

const container = document.getElementById('product-grid');

// 🔁 Show loading spinner while products are loading
container.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;

// Main product loader
async function loadProducts() {
  const productCards = [];

  // ✅ Add custom pinned card (Personalised Design)
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

  // 🔄 Load products from Firestore
  const querySnapshot = await getDocs(collection(db, "Products"));

  // Empty state if no products found
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

  // 🔁 Loop through each product
  querySnapshot.forEach((doc) => {
    const data = doc.data();

    const productCard = document.createElement("div");
    productCard.className = "product-card";
    productCard.setAttribute("data-id", doc.id);
    productCard.setAttribute("data-name", data.name);
    productCard.setAttribute("data-price", data.price);

    // 📦 Set product HTML
    productCard.innerHTML = `
      <a href="product.html?id=${doc.id}" class="product-link">
        <div class="multi-image-wrapper">
          ${Array.isArray(data.images) && data.images.length > 1
            ? data.images.map((img, i) =>
                `<img src="${img}" alt="${data.name}" class="fade-img" style="opacity:${i === 0 ? 1 : 0}; transition: opacity 1.5s ease;">`
              ).join('')
            : `<img src="${Array.isArray(data.images) ? data.images[0] : data.images}" alt="${data.name}" class="fade-img">`
          }
        </div>
        <h3>${data.name}</h3>
        <p>£${parseFloat(data.price).toFixed(2)}</p>
      </a>
      <div class="size-popup hidden">
        <p>Select a size:</p>
        <div class="size-options"></div>
      </div>
      <button class="btn add-to-basket">Add to Basket</button>
    `;

    // ✅ Populate size buttons if sizes exist
    if (data.sizes && Array.isArray(data.sizes) && data.sizes.length > 0) {
      const sizeOptions = productCard.querySelector('.size-options');
      data.sizes.forEach(size => {
        const btn = document.createElement('button');
        btn.textContent = size;
        btn.className = 'size-btn';
        btn.addEventListener('click', () => {
          addToCart(doc.id, data.name, parseFloat(data.price), size, productCard.querySelector("img")?.src || "placeholder.jpg");
          productCard.querySelector('.size-popup')?.classList.add('hidden');
        });
        sizeOptions.appendChild(btn);
      });
    }

    productCards.push(productCard);
  });

  // ✅ Add products to DOM
  container.innerHTML = '';
  productCards.forEach(card => container.appendChild(card));

  // 🎞️ Handle image fading
  document.querySelectorAll('.multi-image-wrapper').forEach(wrapper => {
    const images = wrapper.querySelectorAll('.fade-img');
    if (images.length <= 1) return;

    let i = 0;
    setInterval(() => {
      images[i].style.opacity = 0;
      i = (i + 1) % images.length;
      images[i].style.opacity = 1;
    }, 6000); // Slower cycle
  });
}

loadProducts();

// 🛒 Add-to-basket button logic
document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("click", (e) => {
    if (e.target && e.target.classList.contains("add-to-basket")) {
      const product = e.target.closest(".product-card");
      const id = product.dataset.id;
      const name = product.dataset.name;
      const price = parseFloat(product.dataset.price);
      const image = product.querySelector("img")?.src || "placeholder.jpg";

      const sizePopup = product.querySelector('.size-popup');
      const hasSizes = sizePopup && sizePopup.querySelector('.size-options')?.children.length > 0;

      if (hasSizes) {
        sizePopup.classList.remove('hidden');
      } else {
        addToCart(id, name, price, null, image);
      }
    }
  });
});

// 🧠 Helper: Add to cart logic with size support
function addToCart(id, name, price, size, image) {
  const cartKey = "daisyCart";
  let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
  const existing = cart.find(item => item.id === id && item.size === size);

  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id, name, price, qty: 1, size, image });
  }

  localStorage.setItem(cartKey, JSON.stringify(cart));
  if (typeof syncBasketToFirestore === "function") syncBasketToFirestore(cart);
  logBasketActivity({ id, name, qty: 1, size });
  document.getElementById("basket-preview")?.classList.remove("hidden");
  if (typeof updateBasketPreview === "function") updateBasketPreview(true);
}

// 🧾 Firestore log (for admin tracking)
async function logBasketActivity(product) {
  try {
    await addDoc(collection(db, "BasketUpdates"), {
      name: product.name,
      productId: product.id,
      qty: product.qty || 1,
      size: product.size || null,
      timestamp: serverTimestamp()
    });
    console.log("📤 Basket activity logged.");
  } catch (err) {
    console.error("❌ Error logging basket activity:", err);
  }
}

// 🔃 Optional: Price sorting buttons
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
