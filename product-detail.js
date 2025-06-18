import { db } from './firebase.js';
import { doc, getDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

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

    // DOM Elements
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

    const images = Array.isArray(data.images) ? data.images : [data.image];
    if (mainImg) {
      mainImg.src = images[0] || '';
      mainImg.alt = data.name;
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

    // Handle sizes
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

    // ✅ Hide loader when all product data is rendered
    document.getElementById("page-loader")?.remove();

  } catch (error) {
    console.error("Error loading product:", error);
    document.querySelector('.product-container').innerHTML = '<p>Error loading product.</p>';
  }
}

loadProduct();

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

      // 🔁 Sync to Firestore if defined
      if (typeof syncBasketToFirestore === "function") {
        syncBasketToFirestore(cart);
      }

      logBasketActivity({ id: productId, name, qty: quantity });
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
      timestamp: serverTimestamp()
    });
    console.log("📤 Basket activity logged.");
  } catch (err) {
    console.error("❌ Error logging basket activity:", err);
  }
}
