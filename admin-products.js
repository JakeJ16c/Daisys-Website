
// ================= Firebase Imports =================
// Import Firebase modules for app initialization, Firestore DB, and Storage
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, deleteDoc, setDoc, doc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js";
import { getApps } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";

// ================= Firebase Config =================
// Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyA6kN9-7dN9Ovq6BmWBBJwBhLXRW6INX4c",
  authDomain: "daisy-s-website.firebaseapp.com",
  projectId: "daisy-s-website",
  storageBucket: "daisy-s-website.firebasestorage.app",
  messagingSenderId: "595443495060",
  appId: "1:595443495060:web:7bbdd1108ad336d55c8481",
};

// ================= Initialize Firebase =================
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig); // Only initialize if not already
} else {
  app = getApps()[0];
}
const db = getFirestore(app);
const storage = getStorage(app);

// ================= DOM Element References =================
// Grabbing DOM elements used in UI
const form = document.getElementById('productForm');
const productList = document.getElementById('productList');
const dropArea = document.getElementById("drop-area");
const fileInput = document.getElementById("imageFileInput");
const uploadStatus = document.getElementById("uploadStatus");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
let uploadedImageURLs = []; // Store multiple URLs


// ================= Load & Render Products =================
async function loadProducts() {
  productList.innerHTML = ''; // Clear list before render
  const snapshot = await getDocs(collection(db, "Products"));

  snapshot.forEach((product) => {
    const data = product.data();
    const li = document.createElement('li');

    // Product card layout
    li.innerHTML = `
      <div style="display:flex; align-items:center; gap:1rem;">
       <img src="${data.images?.[0] || ''}" alt="${data.name}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;" />
        <span><strong>${data.name}</strong> - £${parseFloat(data.price).toFixed(2)}</span>
      </div>
      <div>
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </div>`;

    // 🗑️ Delete button logic
    li.querySelector('.delete-btn').onclick = async () => {
      await deleteDoc(doc(db, "Products", product.id));
      loadProducts(); // Refresh list
    };

    // ✏️ Edit button logic
    li.querySelector('.edit-btn').onclick = () => {
      document.getElementById('title').value = data.name;
      document.getElementById('price').value = data.price;
      document.getElementById('description').value = data.description;

      uploadedImageURLs = data.images || [];
      imagePreviewContainer.innerHTML = "";
      uploadedImageURLs.forEach(url => {
        const img = document.createElement("img");
        img.src = url;
        img.alt = "Preview";
        img.style.width = "60px";
        img.style.height = "60px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "4px";
        img.style.marginRight = "6px";
        imagePreviewContainer.appendChild(img);
      });
      uploadStatus.textContent = "Images loaded (editing)";

      form.setAttribute('data-edit-id', product.id);
    };

    productList.appendChild(li);
  });
}

// ================= Handle Form Submission =================
form.onsubmit = async (e) => {
  e.preventDefault();

  const name = document.getElementById('title').value.trim();
  const price = parseFloat(document.getElementById('price').value);
  const description = document.getElementById('description').value.trim();
  const editId = form.getAttribute('data-edit-id');

  if (!uploadedImageURLs.length) {
  alert("Please upload at least one image before submitting.");
  return;
}

const productData = { name, images: uploadedImageURLs, price, description };

  if (editId) {
    await setDoc(doc(db, "Products", editId), productData);
    form.removeAttribute('data-edit-id');
  } else {
    await addDoc(collection(db, "Products"), productData);
  }

  // Reset form state after submission
  form.reset();
  uploadedImageURLs = [];
  uploadStatus.textContent = "No file selected";
  imagePreviewContainer.innerHTML = '';
  };

// ================= Image Upload Logic =================

// Trigger hidden file input when drop area is clicked
dropArea.addEventListener("click", () => fileInput.click());

// Highlight drop area on drag over
dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("highlight");
});

// Remove highlight when drag leaves area
dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("highlight");
});

// Handle file drop onto area
dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("highlight");
  const files = Array.from(e.dataTransfer.files);
  handleFileUpload(files);
});

// File input change triggers upload
fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files);
  handleFileUpload(files);
});


// 📤 Upload image to Firebase Storage
async function handleFileUpload(files) {
  if (!files.length) return;

  uploadStatus.textContent = "Uploading...";
  imagePreviewContainer.innerHTML = ""; // Clear existing previews
  uploadedImageURLs = [];

  for (const file of files) {
    const uniqueName = `${Date.now()}-${file.name}`;
    const fileRef = storageRef(storage, `product-images/${uniqueName}`);

   try {
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  uploadedImageURLs.push(url);

  uploadStatus.textContent = "Upload complete!";

  // ✅ Display image preview
  const previewContainer = document.getElementById("imagePreviewContainer");
  const img = document.createElement("img");
  img.src = url;
  img.alt = "Preview";
  img.style.maxWidth = "100px";
  img.style.marginTop = "10px";
  img.style.borderRadius = "4px";
  img.style.marginRight = "6px";
  previewContainer.appendChild(img);
} catch (err) {
  console.error("Upload failed", err);
  uploadStatus.textContent = "Upload failed.";
}
  }
}

// ================= Init =================
loadProducts(); // Load products on initial page load
