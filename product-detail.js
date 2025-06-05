// /js/product-detail.js
import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// Get product ID
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

let currentProduct = null;

// Load Product from Firestore
async function loadProduct() {
  if (!productId) return;

  try {
    const ref = doc(db, "Products", productId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const data = snap.data();
    currentProduct = { ...data, id: productId };

    document.querySelector('.product-title').textContent = data.name;
    document.querySelector('.product-description').textContent = data.description || '';
    document.querySelector('.product-price').textContent = `£${parseFloat(data.price).toFixed(2)}`;

    const images = Array.isArray(data.images) ? data.images : [data.image];
    const mainImg = document.getElementById('product-image');
    const thumbs = [document.getElementById('thumb1'), document.getElementById('thumb2'), document.getElementById('thumb3')];

    mainImg.src = images[0] || '';
    mainImg.alt = data.name;

    thumbs.forEach((thumb, i) => {
      if (images[i]) {
        thumb.src = images[i];
        thumb.alt = `Thumb ${i + 1}`;
        thumb.style.display = 'block';
        thumb.addEventListener('click', () => {
          mainImg.src = thumb.src;
        });
      } else {
        thumb.style.display = 'none';
      }
    });

  } catch (error) {
    console.error("Error loading product:", error);
  }
}

// Setup Quantity and Basket Controls
function setupControls() {
  const qtySpan = document.querySelector('.quantity-selector span');
  const minusBtn = document.querySelector('.quantity-selector button:first-of-type');
  const plusBtn = document.querySelector('.quantity-selector button:last-of-type');
  const addBtn = document.querySelector('.add-to-basket');

  if (!qtySpan || !minusBtn || !plusBtn || !addBtn) {
    console.warn("❌ Buttons not found.");
    return;
  }

  minusBtn.addEventListener('click', () => {
    let qty = parseInt(qtySpan.textContent);
    if (qty > 1) qtySpan.textContent = qty - 1;
  });

  plusBtn.addEventListener('click', () => {
    let qty = parseInt(qtySpan.textContent);
    qtySpan.textContent = qty + 1;
  });

  addBtn.addEventListener('click', () => {
    if (!currentProduct) return alert("Product not ready");

    const qty = parseInt(qtySpan.textContent);
    const basket = JSON.parse(localStorage.getItem("basket") || "[]");

    const existing = basket.find(p => p.id === currentProduct.id);
    if (existing) {
      existing.qty += qty;
    } else {
      basket.push({
        id: currentProduct.id,
        name: currentProduct.name,
        price: currentProduct.price,
        image: Array.isArray(currentProduct.images) ? currentProduct.images[0] : currentProduct.image,
        qty
      });
    }

    localStorage.setItem("daisyCart", JSON.stringify(basket));
    alert("✅ Added to basket!");
  });
}

// Init when DOM fully loaded
document.addEventListener('DOMContentLoaded', async () => {
  await loadProduct();
  setupControls();
});
