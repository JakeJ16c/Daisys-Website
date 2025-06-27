import { db } from './firebase.js';
import { getDocs, collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, getDoc } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

const container = document.getElementById('product-grid');

// 🔁 Show loading spinner
container.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (user) currentUser = user;
  loadProducts();
});

async function loadProducts() {
  const productCards = [];

  // Custom pinned card
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

  const querySnapshot = await getDocs(collection(db, "Products"));
  if (querySnapshot.empty) {
    container.innerHTML = `<p class="no-products">Sorry, we're out of stock. Follow us on Instagram for updates ✨</p>`;
    return;
  }

  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    const docId = docSnap.id;

    const productCard = document.createElement("div");
    productCard.className = "product-card";
    productCard.setAttribute("data-id", docId);
    productCard.setAttribute("data-name", data.name);
    productCard.setAttribute("data-price", data.price);
    productCard.setAttribute("data-onesize", data.oneSizeOnly ? "true" : "false");
    productCard.setAttribute("data-stock", JSON.stringify(data.stock || {}));

    let wishlistIcon = '<i class="fa-regular fa-heart wishlist-icon"></i>';
    if (currentUser) {
      const wishlistDocId = `${docId}OneSize`;
      const wishlistRef = doc(db, "users", currentUser.uid, "Wishlist", wishlistDocId);
      const snap = await getDoc(wishlistRef);
      if (snap.exists()) {
        wishlistIcon = '<i class="fa-solid fa-heart wishlist-icon filled"></i>';
      }
    }

    const imagesHTML = `
      ${
        Array.isArray(data.images) && data.images.length > 1
          ? data.images.map((img, i) =>
              `<img src="${img}" class="fade-img" style="opacity:${i === 0 ? 1 : 0};">`).join('')
          : `<img src="${Array.isArray(data.images) ? data.images[0] : data.images}" class="fade-img">`
      }
      ${wishlistIcon}
    `;

    productCard.innerHTML = `
      <a href="product.html?id=${docId}" class="product-link">
        <div class="multi-image-wrapper">${imagesHTML}</div>
        <h3 class="product-name">${data.name}</h3>
        <p class="product-price">£${parseFloat(data.price).toFixed(2)}</p>
      </a>
      <div class="size-popup hidden"></div>
      <button class="btn add-to-basket">Add to Basket</button>
    `;

    productCards.push(productCard);
  }

  container.innerHTML = '';
  productCards.forEach(card => container.appendChild(card));

  // Handle fading product images
  document.querySelectorAll('.multi-image-wrapper').forEach(wrapper => {
    const images = wrapper.querySelectorAll('.fade-img');
    if (images.length <= 1) return;
    let i = 0;
    setInterval(() => {
      images[i].style.opacity = 0;
      i = (i + 1) % images.length;
      images[i].style.opacity = 1;
    }, 5000);
  });
}

// 🛒 Handle Add to Basket + Wishlist

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("add-to-basket")) {
    const card = e.target.closest(".product-card");
    const id = card.dataset.id;
    const name = card.dataset.name;
    const price = parseFloat(card.dataset.price);
    const image = card.querySelector("img")?.src || "placeholder.jpg";
    const oneSize = card.dataset.onesize === "true";
    const stock = JSON.parse(card.dataset.stock || "{}");
    const sizePopup = card.querySelector(".size-popup");

    if (!oneSize && Object.keys(stock).length > 0) {
      if (sizePopup.classList.contains("hidden")) {
        sizePopup.innerHTML = `<p>Please select a size below</p>` + Object.entries(stock).map(([size, qty]) => {
          return qty > 0 ? `<button class="size-option" data-size="${size}">${size}</button>` : '';
        }).join('');
        sizePopup.classList.remove("hidden");
        return;
      }
    } else {
      addToCart(id, name, price, image, "OneSize");
    }
  }

  if (e.target.classList.contains("size-option")) {
    const size = e.target.dataset.size;
    const card = e.target.closest(".product-card");
    const id = card.dataset.id;
    const name = card.dataset.name;
    const price = parseFloat(card.dataset.price);
    const image = card.querySelector("img")?.src || "placeholder.jpg";
    card.querySelector(".size-popup").classList.add("hidden");
    addToCart(id, name, price, image, size);
  }

  if (e.target.classList.contains("wishlist-icon") || e.target.closest(".wishlist-icon")) {
    const icon = e.target.closest(".wishlist-icon");
    if (!currentUser) return alert("Please log in to use wishlist");
    const card = icon.closest(".product-card");
    const productId = card.getAttribute("data-id");
    const name = card.querySelector('.product-name')?.textContent;
    const price = parseFloat(card.querySelector('.product-price')?.textContent.replace("£", ""));
    const image = card.querySelector('img')?.src;
    const size = "OneSize";
    const wishlistDocId = `${productId}${size}`;
    const wishlistRef = doc(db, "users", currentUser.uid, "Wishlist", wishlistDocId);

    if (icon.classList.contains("filled")) {
      deleteDoc(wishlistRef);
      icon.classList.remove("filled");
      icon.innerHTML = '<i class="fa-regular fa-heart"></i>';
    } else {
      setDoc(wishlistRef, { name, price, image, size });
      icon.classList.add("filled");
      icon.innerHTML = '<i class="fa-solid fa-heart"></i>';
    }
  }
});

function addToCart(id, name, price, image, size = "OneSize") {
  const cartKey = "daisyCart";
  let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
  const existing = cart.find(item => item.id === id && item.size === size);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id, name, price, qty: 1, image, size });
  }
  localStorage.setItem(cartKey, JSON.stringify(cart));
  if (typeof syncBasketToFirestore === "function") {
    syncBasketToFirestore(cart);
  }
  logBasketActivity({ id, name, qty: 1, size });
  document.getElementById("basket-preview")?.classList.remove("hidden");
  if (typeof updateBasketPreview === "function") {
    updateBasketPreview(true);
  }
}

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
