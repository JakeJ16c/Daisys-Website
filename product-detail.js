// /js/product-detail.js
import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// Get the product ID from the URL
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

let data = null;
let images = [];

async function loadProduct() {
  if (!productId) {
    document.querySelector('.product-layout').innerHTML = '<p>Invalid product ID.</p>';
    return;
  }

  try {
    const ref = doc(db, "Products", productId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      document.querySelector('.product-layout').innerHTML = '<p>Product not found.</p>';
      return;
    }

    data = snap.data();
    images = Array.isArray(data.images) ? data.images : [data.image];

    // Set product details
    document.querySelector('.product-title').textContent = data.name;
    document.querySelector('.product-price').textContent = `£${parseFloat(data.price).toFixed(2)}`;
    document.querySelector('.product-description').textContent = data.description || '';

    // Set images
    const mainImg = document.getElementById('product-image');
    const thumb1 = document.getElementById('thumb1');
    const thumb2 = document.getElementById('thumb2');
    const thumb3 = document.getElementById('thumb3');

    mainImg.src = images[0] || '';
    mainImg.alt = data.name;

    thumb1.src = images[0] || '';
    thumb2.src = images[1] || '';
    thumb3.src = images[2] || '';

    [thumb1, thumb2, thumb3].forEach(thumb => {
      thumb.addEventListener('click', () => {
        mainImg.src = thumb.src;
      });
    });

    setupQuantityControls();
    setupAddToBasket();

  } catch (error) {
    console.error("Error loading product:", error);
    document.querySelector('.product-layout').innerHTML = '<p>Error loading product.</p>';
  }
}

function setupQuantityControls() {
  const qtyDisplay = document.querySelector('.quantity-selector span');
  const minusBtn = document.querySelector('.quantity-selector button:first-child');
  const plusBtn = document.querySelector('.quantity-selector button:last-child');

  minusBtn.addEventListener('click', () => {
    let qty = parseInt(qtyDisplay.textContent);
    if (qty > 1) qtyDisplay.textContent = qty - 1;
  });

  plusBtn.addEventListener('click', () => {
    let qty = parseInt(qtyDisplay.textContent);
    qtyDisplay.textContent = qty + 1;
  });
}

function setupAddToBasket() {
  const addToCartBtn = document.querySelector('.add-to-cart');
  const qtyDisplay = document.querySelector('.quantity-selector span');

  addToCartBtn.addEventListener('click', () => {
    const quantity = parseInt(qtyDisplay.textContent) || 1;

    const product = {
      id: productId,
      name: data.name,
      price: parseFloat(data.price),
      image: images[0] || '',
      quantity
    };

    let basket = JSON.parse(localStorage.getItem('basket')) || [];

    const existing = basket.find(p => p.id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      basket.push(product);
    }

    localStorage.setItem('basket', JSON.stringify(basket));

    if (typeof updateBasketDropdown === 'function') {
      updateBasketDropdown();
      const dropdown = document.getElementById('basket-preview');
      if (dropdown) dropdown.classList.add('show');
    }
  });
}

loadProduct();
