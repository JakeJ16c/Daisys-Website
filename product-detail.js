import { db } from './firebase.js';
import { doc, getDoc, addDoc, collection, serverTimestamp, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");
let currentUser = null;

// 🔐 Wait for user login state before loading product
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  loadProduct();
});

async function loadProduct() {
  if (!productId) {
    document.querySelector('.product-container').innerHTML = '<p>Invalid product ID.</p>';
    return;
  }

  try {
    const ref = doc(db, "Products", productId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      document.querySelector('.product-container').innerHTML = '<p>Product not found.</p>';
      return;
    }

    const data = snap.data();
    const images = Array.isArray(data.images) ? data.images : [data.image];

    // ✅ Now we can safely build the mobile carousel
    const carouselImages = document.getElementById('carouselImages');
    const carouselDots = document.getElementById('carouselDots');
    
    if (carouselImages && images.length) {
      carouselImages.innerHTML = '';
      carouselDots.innerHTML = '';
    
      images.forEach((imgUrl, index) => {
        const img = document.createElement('img');
        img.src = imgUrl;
        img.alt = data.name;
        img.style.minWidth = '100%';
        img.style.objectFit = 'cover';
        img.style.scrollSnapAlign = 'start';
        carouselImages.appendChild(img);
    
        const dot = document.createElement('span');
        dot.className = 'dot' + (index === 0 ? ' active' : '');
        dot.dataset.index = index;
        carouselDots.appendChild(dot);
      });
    
      // 🧠 Ensure styling for flex scroll
      carouselImages.style.display = 'flex';
      carouselImages.style.overflowX = 'scroll';
      carouselImages.style.scrollSnapType = 'x mandatory';
      carouselImages.style.scrollBehavior = 'smooth';
      carouselImages.style.webkitOverflowScrolling = 'touch';
    
      carouselImages.scrollLeft = 0;
      let currentIndex = 0;
      const dots = carouselDots.querySelectorAll('.dot');
    
      carouselImages.addEventListener('scroll', () => {
        const width = carouselImages.offsetWidth;
        const index = Math.round(carouselImages.scrollLeft / width);
        if (index !== currentIndex) {
          dots.forEach(dot => dot.classList.remove('active'));
          if (dots[index]) dots[index].classList.add('active');
          currentIndex = index;
        }
      });
    
      dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
          carouselImages.scrollTo({
            left: index * carouselImages.offsetWidth,
            behavior: 'smooth'
          });
        });
      });
    }

    const titleEl = document.querySelector('.product-title');
    const priceEl = document.querySelector('.product-price');
    const descEl = document.querySelector('.product-description');
    const mainImg = document.getElementById('product-image');
    const thumbStack = document.querySelector('.thumbnail-stack');
    const sizeContainer = document.getElementById('size-container');
    const sizeDropdown = document.getElementById('size-dropdown');

    if (titleEl) titleEl.textContent = data.name;
    if (priceEl) priceEl.textContent = `£${parseFloat(data.price).toFixed(2)}`;
    if (descEl) descEl.textContent = data.description || '';

    if (mainImg) {
      mainImg.src = images[0] || '';
      mainImg.alt = data.name;
      mainImg.parentElement.style.position = 'relative';

      // Wishlist logic...
      const heartIcon = document.createElement('i');
      heartIcon.className = 'fa-regular fa-heart wishlist-icon';
      mainImg.parentElement.appendChild(heartIcon);

      if (currentUser) {
        const wishlistDocId = `${productId}OneSize`;
        const wishlistRef = doc(db, "users", currentUser.uid, "Wishlist", wishlistDocId);
        const snap = await getDoc(wishlistRef);
        if (snap.exists()) {
          heartIcon.classList.add("filled", "fa-solid");
          heartIcon.classList.remove("fa-regular");
        }
      }

      heartIcon.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (!currentUser) return alert("Please log in to use wishlist");

        const name = data.name;
        const price = data.price;
        const image = mainImg.src;
        const size = "OneSize";
        const wishlistDocId = `${productId}${size}`;
        const wishlistRef = doc(db, "users", currentUser.uid, "Wishlist", wishlistDocId);

        if (heartIcon.classList.contains("filled")) {
          try {
            await deleteDoc(wishlistRef);
            heartIcon.classList.remove("filled", "fa-solid");
            heartIcon.classList.add("fa-regular");
          } catch (err) {
            console.error("❌ Failed to remove from wishlist:", err);
            alert("Error removing from wishlist. Please try again.");
          }
        } else {
          try {
            await setDoc(wishlistRef, { name, price, image, size });
            heartIcon.classList.add("filled", "fa-solid");
            heartIcon.classList.remove("fa-regular");
          } catch (err) {
            console.error("❌ Failed to add to wishlist:", err);
            alert("Error adding to wishlist. Please try again.");
          }
        }
      });
    }

    if (thumbStack) {
      thumbStack.innerHTML = '';
      images.forEach((imgUrl) => {
        const thumb = document.createElement('img');
        thumb.src = imgUrl;
        thumb.className = 'thumb';
        thumb.addEventListener('click', () => {
          mainImg.src = imgUrl;
        });
        thumbStack.appendChild(thumb);
      });
    }

    if (!data.oneSizeOnly && typeof data.stock === 'object') {
      sizeContainer.style.display = 'block';
      sizeDropdown.innerHTML = '';
      Object.entries(data.stock).forEach(([size, qty]) => {
        if (qty > 0) {
          const option = document.createElement('option');
          option.value = size;
          option.textContent = `${size} (${qty} available)`;
          sizeDropdown.appendChild(option);
        }
      });

      if (sizeDropdown.options.length === 0) {
        const option = document.createElement("option");
        option.textContent = "Out of stock";
        option.disabled = true;
        sizeDropdown.appendChild(option);
        sizeDropdown.disabled = true;
      } else {
        sizeDropdown.disabled = false;
      }
    } else {
      sizeContainer.style.display = 'none';
    }

    if (!data.oneSizeOnly && typeof data.stock === 'object') {
  // Existing size dropdown code...
  
  // Check if ALL sizes are out of stock
  const allOutOfStock = Object.values(data.stock).every(qty => qty === 0);
  updateStockUI(allOutOfStock);

  // 👇 Optional: update stock check when size is changed
  sizeDropdown.addEventListener("change", () => {
    const selectedQty = data.stock[sizeDropdown.value];
    updateStockUI(selectedQty <= 0);
  });

} else {
  // One size only
  updateStockUI((data.stock ?? 0) <= 0);
}


    document.getElementById("page-loader")?.remove();
  } catch (error) {
    console.error("Error loading product:", error);
    document.querySelector('.product-container').innerHTML = '<p>Error loading product.</p>';
  }
}

function updateStockUI(isOutOfStock) {
  const addBtn = document.querySelector(".add-to-basket");
  const buyBtn = document.getElementById("buy-now-button");
  const msg = document.getElementById("out-of-stock-msg");

  if (isOutOfStock) {
    addBtn.disabled = true;
    addBtn.style.opacity = "0.5";
    addBtn.style.pointerEvents = "none";

    if (buyBtn) {
      buyBtn.disabled = true;
      buyBtn.style.opacity = "0.5";
      buyBtn.style.pointerEvents = "none";
    }

    msg.style.display = "block";
  } else {
    addBtn.disabled = false;
    addBtn.style.opacity = "1";
    addBtn.style.pointerEvents = "auto";

    if (buyBtn) {
      buyBtn.disabled = false;
      buyBtn.style.opacity = "1";
      buyBtn.style.pointerEvents = "auto";
    }

    msg.style.display = "none";
  }
}

// Quantity Controls
let quantity = 1;
const quantityDisplay = document.querySelector('.quantity-selector span');

document.querySelector('.quantity-selector button:first-of-type').addEventListener('click', () => {
  if (quantity > 1) quantity--;
  quantityDisplay.textContent = quantity;
});

document.querySelector('.quantity-selector button:last-of-type').addEventListener('click', () => {
  quantity++;
  quantityDisplay.textContent = quantity;
});

// Add to Basket

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("click", (e) => {
    if (e.target && e.target.classList.contains("add-to-basket")) {
      const name = document.querySelector(".product-title").textContent;
      const price = parseFloat(document.querySelector(".product-price").textContent.replace("£", ""));
      const image = document.getElementById("product-image").src;
      const sizeDropdown = document.getElementById("size-dropdown");
      const selectedSize = sizeDropdown && sizeDropdown.value ? sizeDropdown.value : "OneSize";

      const cartKey = "daisyCart";
      let cart = JSON.parse(localStorage.getItem(cartKey)) || [];

      const existing = cart.find(item => item.id === productId && item.size === selectedSize);
      if (existing) {
        existing.qty += quantity;
      } else {
        cart.push({ id: productId, name, price, qty: quantity, image, size: selectedSize });
      }

      localStorage.setItem(cartKey, JSON.stringify(cart));

      if (typeof syncBasketToFirestore === "function") {
        syncBasketToFirestore(cart);
      }

      logBasketActivity({ id: productId, name, qty: quantity, size: selectedSize });
      document.getElementById("basket-preview")?.classList.remove("hidden");
      if (typeof updateBasketPreview === "function") {
        updateBasketPreview(true);
      }
    }
  });
});

function showApplePayButtonIfAvailable() {
  if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
    document.getElementById('apple-pay-button').style.display = 'flex';
    document.getElementById('buy-now-button').style.display = 'none';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(showApplePayButtonIfAvailable, 100);
});

async function logBasketActivity(product) {
  try {
    await addDoc(collection(db, "BasketUpdates"), {
      name: product.name,
      productId: product.id,
      qty: product.qty || 1,
      size: product.size || null,
      isGuest: !currentUser,
      timestamp: serverTimestamp()
    });
    console.log("📤 Basket activity logged.");
  } catch (err) {
    console.error("❌ Error logging basket activity:", err);
  }
}
