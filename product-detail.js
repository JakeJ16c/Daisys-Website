import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

let quantity = 1;

async function loadProduct() {
  if (!productId) return;

  try {
    const ref = doc(db, "Products", productId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data();
    const images = Array.isArray(data.images) ? data.images : [data.image];

    // Populate content
    document.querySelector('.product-title').textContent = data.name;
    document.querySelector('.product-description').textContent = data.description || '';
    document.querySelector('.product-price').textContent = `£${parseFloat(data.price).toFixed(2)}`;

    // Load images
    const mainImg = document.getElementById('product-image');
    const thumbs = [document.getElementById('thumb1'), document.getElementById('thumb2'), document.getElementById('thumb3')];

    mainImg.src = images[0] || '';
    mainImg.alt = data.name;

    thumbs.forEach((thumb, i) => {
      if (thumb && images[i]) {
        thumb.src = images[i];
        thumb.alt = `${data.name} Thumb ${i + 1}`;
        thumb.addEventListener('click', () => {
          mainImg.src = images[i];
        });
      }
    });

    // Store for cart
    window.currentProduct = {
      id: productId,
      name: data.name,
      price: parseFloat(data.price),
      image: images[0] || '',
    };
  } catch (err) {
    console.error('Failed to load product:', err);
  }
}

function setupQuantityControls() {
  const display = document.querySelector('.quantity-selector span');
  const minus = document.querySelector('.quantity-selector button:first-of-type');
  const plus = document.querySelector('.quantity-selector button:last-of-type');

  minus?.addEventListener('click', () => {
    if (quantity > 1) {
      quantity--;
      display.textContent = quantity;
    }
  });

  plus?.addEventListener('click', () => {
    quantity++;
    display.textContent = quantity;
  });
}

function setupAddToCart() {
  const btn = document.querySelector('.add-to-cart');
  btn?.addEventListener('click', () => {
    if (!window.currentProduct) return;

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existing = cart.find(item => item.id === window.currentProduct.id);

    if (existing) {
      existing.qty += quantity;
    } else {
      cart.push({ ...window.currentProduct, qty: quantity });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    alert(`${window.currentProduct.name} added to cart!`);
  });
}

loadProduct();
setupQuantityControls();
setupAddToCart();
