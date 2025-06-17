import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { getDocs, getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

// Get the product ID from the URL
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

    // Fill in the HTML elements
    document.querySelector('.product-title').textContent = data.name;
    document.querySelector('.product-price').textContent = `£${parseFloat(data.price).toFixed(2)}`;
    document.querySelector('.product-description').textContent = data.description || '';

    const mainImg = document.getElementById('product-image');
    const thumbStack = document.querySelector('.thumbnail-stack');
    const sizeContainer = document.getElementById('size-container');
    const sizeDropdown = document.getElementById('size-dropdown');

    const images = Array.isArray(data.images) ? data.images : [data.image];

    // Set main image
    mainImg.src = images[0] || '';
    mainImg.alt = data.name;

    // Clear any existing thumbnails
    thumbStack.innerHTML = '';

    // Add thumbnails dynamically
    images.forEach((imgUrl) => {
      const thumb = document.createElement('img');
      thumb.src = imgUrl;
      thumb.className = 'thumb';
      thumb.addEventListener('click', () => {
        mainImg.src = imgUrl;
      });
      thumbStack.appendChild(thumb);
    });

    // Handle size logic
    if (typeof data.stock === 'object' && data.stock !== null) {
      // Multi-size
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
    } else {
      // One size only or undefined
      sizeContainer.style.display = 'none';
    }

  } catch (error) {
    console.error("Error loading product:", error);
    document.querySelector('.product-container').innerHTML = '<p>Error loading product.</p>';
  }
}

loadProduct();

// ========== Quantity Controls ==========
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

// ========== Add to Basket ==========
document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("click", (e) => {
    if (e.target && e.target.classList.contains("add-to-basket")) {
      const id = productId;
      const name = document.querySelector(".product-title").textContent;
      const price = parseFloat(document.querySelector(".product-price").textContent.replace("£", ""));
      const image = document.getElementById("product-image").src;
      const sizeDropdown = document.getElementById("size-dropdown");
      const selectedSize = sizeDropdown && sizeDropdown.value ? sizeDropdown.value : null;

      const cartKey = "daisyCart";
      let cart = JSON.parse(localStorage.getItem(cartKey)) || [];

      const existing = cart.find((item) => item.id === id && item.size === selectedSize);

      if (existing) {
        existing.qty += quantity;
      } else {
        cart.push({ id, name, price, qty: quantity, image, size: selectedSize });
      }

      localStorage.setItem(cartKey, JSON.stringify(cart));
      logBasketActivity({ id, name, qty: quantity });
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
