import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

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

    const images = Array.isArray(data.images) ? data.images : [data.image];

    // Set main image
    mainImg.src = images[0] || '';
    mainImg.alt = data.name;

    // Clear any existing thumbnails
    thumbStack.innerHTML = '';

    // Add thumbnails dynamically
    images.forEach((imgUrl, index) => {
      const thumb = document.createElement('img');
      thumb.src = imgUrl;
      thumb.alt = `Thumb ${index + 1}`;
      thumb.className = 'thumb';
      thumb.addEventListener('click', () => {
        mainImg.src = imgUrl;
      });
      thumbStack.appendChild(thumb);
    });

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
document.querySelector('.add-to-basket').addEventListener('click', () => {
  const title = document.querySelector('.product-title').textContent;
  const price = parseFloat(document.querySelector('.product-price').textContent.replace('£', ''));
  const image = document.getElementById('product-image').src;

  const cart = JSON.parse(localStorage.getItem('daisyCart')) || [];
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += quantity;
  } else {
    cart.push({ id: productId, name: title, price, image, qty: quantity });
  }
  localStorage.setItem('daisyCart', JSON.stringify(cart));
  
  // Refresh basket dropdown if available
  const updateBasketDropdown = window.updateBasketDropdown;
  if (typeof updateBasketDropdown === 'function') {
    updateBasketDropdown();
  }

  // Trigger basket open if exists
  const basketIcon = document.querySelector('.cart-icon');
  if (basketIcon) basketIcon.click();
});
