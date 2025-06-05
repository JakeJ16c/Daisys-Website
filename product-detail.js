// /js/product-detail.js
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
    const mainImg = document.getElementById('product-image');
    const thumb1 = document.getElementById('thumb1');
    const thumb2 = document.getElementById('thumb2');
    const thumb3 = document.getElementById('thumb3');
    
    const images = Array.isArray(data.images) ? data.images : [data.image];
    
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

    document.querySelector('.product-description').textContent = data.description || '';

    // Optional: dynamically render sizes if you have that
    // document.querySelector('.product-sizes').innerHTML = ...

  } catch (error) {
    console.error("Error loading product:", error);
    document.querySelector('.product-container').innerHTML = '<p>Error loading product.</p>';
  }
}

loadProduct();
