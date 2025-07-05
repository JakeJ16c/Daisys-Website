import { db } from './firebase.js';
import { getDocs, collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, getDoc } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

const container = document.getElementById('product-grid');
if (!container) {
  // Stop executing this file if we’re not on the product page
  console.log("⏹️ products.js skipped: #product-grid not found.");
  return;
}
container.innerHTML = `<div class="spinner-container"><div class="spinner"></div></div>`;


let currentUser = null;

// 🔐 Listen for login/logout changes
onAuthStateChanged(auth, (user) => {
  if (user) currentUser = user;
  loadProducts(); // Load products after knowing user status
});

async function loadProducts() {
  const productCards = [];

// 🔁 Conditionally add custom design card
const settingsSnap = await getDoc(doc(db, "SiteSettings", "design"));
const personalisedEnabled = settingsSnap.exists() && settingsSnap.data().personalisedDesignEnabled;

if (personalisedEnabled) {
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
}

  const querySnapshot = await getDocs(collection(db, "Products"));

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

    // 🔍 Check if item is already in wishlist for current user
    let wishlistIconClass = "fa-regular";
    let isFilled = "";

    if (currentUser) {
      const wishlistDocId = `${docId}OneSize`;
      const wishlistRef = doc(db, "users", currentUser.uid, "Wishlist", wishlistDocId);
      const snap = await getDoc(wishlistRef);
      if (snap.exists()) {
        wishlistIconClass = "fa-solid";
        isFilled = "filled";
      }
    }

    // 🖼 Handle images + heart icon
    const imagesHTML = `
      ${
        Array.isArray(data.images) && data.images.length > 1
          ? data.images.map((img, i) =>
              `<img src="${img}" class="fade-img" style="opacity:${i === 0 ? 1 : 0};">`).join('')
          : `<img src="${Array.isArray(data.images) ? data.images[0] : data.images}" class="fade-img">`
      }
      <i class="${wishlistIconClass} fa-heart wishlist-icon ${isFilled}"></i>
    `;

    // 🧱 Final card structure
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

  // 🎞️ Animate image fading
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

// 🎯 Basket + Wishlist Handling
document.addEventListener("click", (e) => {
  // 🧺 Add to Basket
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
      addToCart(id, name, price, image);
    }
  }

  // 📏 Size selection logic
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

  // ❤️ Wishlist toggle
  if (e.target.classList.contains("wishlist-icon") || e.target.closest(".wishlist-icon")) {
    e.preventDefault();
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

    // Toggle logic
    (async () => {
      if (icon.classList.contains("filled")) {
        // Remove from wishlist
        try {
          await deleteDoc(wishlistRef);
          icon.classList.remove("filled", "fa-solid");
          icon.classList.add("fa-regular");
        } catch (err) {
          console.error("❌ Failed to remove from wishlist:", err);
          alert("Error removing from wishlist. Please try again.");
        }
      } else {
        // Add to wishlist
        try {
          await setDoc(wishlistRef, { name, price, image, size });
          icon.classList.add("filled", "fa-solid");
          icon.classList.remove("fa-regular");
        } catch (err) {
          console.error("❌ Failed to add to wishlist:", err);
          alert("Error adding to wishlist. Please try again.");
        }
      }
    })();
  }
});

// ➕ Add item to localStorage cart
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

// 📤 Track basket updates in Firestore
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
