// /js/product-detail.js
import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// Get the product ID from the URL
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

let quantity = 1;

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
    const thumb1 = document.getElementById('thumb1');
    const thumb2 = document.getElementById('thumb2');
    const thumb3 = document.getElementById('thumb3');
    const images = Array.isArray(data.images) ? data.images : [data.image];

    mainImg.src = images[0] || '';
    mainImg.alt = data.name;

    if (thumb1) thumb1.src = images[0] || '';
    if (thumb2) thumb2.src = images[1] || '';
    if (thumb3) thumb3.src = images[2] || '';

    [thumb1, thumb2, thumb3].forEach(thumb => {
      if (thumb && thumb.src) {
        thumb.addEventListener('click', () => {
          mainImg.src = thumb.src;
        });
      }
    });

  } catch (error) {
    console.error("Error loading product:", error);
    document.querySelector('.product-container').innerHTML = '<p>Error loading product.</p>';
  }
}

function setupQuantityControls() {
  const qtyDisplay = document.querySelector('.quantity-selector span');
  document.querySelector('.quantity-selector button:first-of-type').addEventListener('click', () => {
    if (quantity > 1) {
      quantity--;
      qtyDisplay.textContent = quantity;
    }
  });
  document.querySelector('.quantity-selector button:last-of-type').addEventListener('click', () => {
    quantity++;
    qtyDisplay.textContent = quantity;
  });
}

function setupAddToCart() {
  const button = document.querySelector('.add-to-cart');
  button.addEventListener('click', () => {
    const title = document.querySelector('.product-title').textContent;
    const price = parseFloat(document.querySelector('.product-price').textContent.replace('£', ''));
    const image = document.getElementById('product-image').src;

    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const existing = cart.find(item => item.id === productId);

    if (existing) {
      existing.qty += quantity;
    } else {
      cart.push({ id: productId, name: title, price, image, qty: quantity });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    alert(`${title} added to cart!`);
  });
}

loadProduct();
setupQuantityControls();
setupAddToCart();
