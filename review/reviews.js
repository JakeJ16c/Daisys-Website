import { auth, db, storage } from '/firebase.js';
import { addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js';

const starRating = document.getElementById('star-rating');
const ratingInput = document.getElementById('rating');
const reviewForm = document.getElementById('review-form');
const successMessage = document.getElementById('review-success-message');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imageInput = document.getElementById('review-images');

// === Handle Star Clicks ===
starRating.addEventListener('click', (e) => {
  if (!e.target.dataset.value) return;
  const value = parseInt(e.target.dataset.value);
  ratingInput.value = value;

  // Highlight stars
  [...starRating.children].forEach((star, i) => {
    star.classList.toggle('selected', i < value);
  });
});

// === Handle Image Preview ===
imageInput.addEventListener('change', () => {
  imagePreviewContainer.innerHTML = '';
  [...imageInput.files].forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.maxWidth = '80px';
      img.style.marginRight = '10px';
      imagePreviewContainer.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});

// === Upload Images and Return URLs ===
async function uploadImages(files, reviewId) {
  const urls = [];
  for (const file of files) {
    const storageRef = ref(storage, `reviewImages/${reviewId}/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    urls.push(downloadURL);
  }
  return urls;
}

// === Handle Form Submission ===
reviewForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const rating = parseInt(ratingInput.value);
  const reviewText = document.getElementById('review-text').value.trim();
  const reviewerName = document.getElementById('reviewer-name').value.trim() || 'Anonymous';
  const orderId = document.getElementById('order-id').value || null;
  const productId = document.getElementById('product-id').value || null;

  if (!rating || !reviewText) {
    alert('Please provide a star rating and your review.');
    return;
  }

  try {
    const reviewData = {
      rating,
      reviewText,
      reviewerName,
      orderId,
      productId,
      createdAt: serverTimestamp(),
      images: []
    };

    const reviewRef = await addDoc(collection(db, 'Reviews'), reviewData);

    // Handle images
    if (imageInput.files.length > 0) {
      const imageUrls = await uploadImages(imageInput.files, reviewRef.id);
      await reviewRef.update({ images: imageUrls });
    }

    reviewForm.reset();
    ratingInput.value = '';
    [...starRating.children].forEach(star => star.classList.remove('selected'));
    imagePreviewContainer.innerHTML = '';
    successMessage.classList.remove('hidden');
  } catch (err) {
    console.error('Error submitting review:', err);
    alert('An error occurred while submitting your review. Please try again.');
  }
});

// === Auto-fill order/product from URL ===
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');
  const productId = params.get('productId');

  if (orderId) document.getElementById('order-id').value = orderId;
  if (productId) document.getElementById('product-id').value = productId;
});
