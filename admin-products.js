// ================= Firebase Imports =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, deleteDoc, setDoc, doc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js";

// ================= Firebase Config =================
const firebaseConfig = {
  apiKey: "AIzaSyA6kN9-7dN9Ovq6BmWBBJwBhLXRW6INX4c",
  authDomain: "daisy-s-website.firebaseapp.com",
  projectId: "daisy-s-website",
  storageBucket: "daisy-s-website.appspot.com",
  messagingSenderId: "595443495060",
  appId: "1:595443495060:web:7bbdd1108ad336d55c8481",
};

// ================= Initialize App =================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ================= DOM Elements =================
const form = document.getElementById('productForm');
const productList = document.getElementById('productList');
const dropArea = document.getElementById("drop-area");
const fileInput = document.getElementById("imageFileInput");
const uploadStatus = document.getElementById("uploadStatus");

let uploadedImageURL = "";

// ================= Load Products =================
async function loadProducts() {
  productList.innerHTML = '';
  const snapshot = await getDocs(collection(db, "Products"));

  snapshot.forEach((product) => {
    const data = product.data();
    const li = document.createElement('li');
    li.innerHTML = `
      <span><strong>${data.name}</strong> - £${parseFloat(data.price).toFixed(2)}</span>
      <div>
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </div>`;

    // Delete Handler
    li.querySelector('.delete-btn').onclick = async () => {
      await deleteDoc(doc(db, "Products", product.id));
      loadProducts();
    };

    // Edit Handler
    li.querySelector('.edit-btn').onclick = () => {
      document.getElementById('title').value = data.name;
      document.getElementById('price').value = data.price;
      document.getElementById('description').value = data.description;
      uploadedImageURL = data.image; // Load existing image for editing
      form.setAttribute('data-edit-id', product.id);
      uploadStatus.textContent = "Image loaded (editing)";
    };

    productList.appendChild(li);
  });
}

// ================= Handle Product Form =================
form.onsubmit = async (e) => {
  e.preventDefault();

  const name = document.getElementById('title').value.trim();
  const price = parseFloat(document.getElementById('price').value);
  const description = document.getElementById('description').value.trim();
  const editId = form.getAttribute('data-edit-id');

  if (!uploadedImageURL) {
    alert("Please upload an image before submitting.");
    return;
  }

  const productData = { name, image: uploadedImageURL, price, description };

  if (editId) {
    await setDoc(doc(db, "Products", editId), productData);
    form.removeAttribute('data-edit-id');
  } else {
    await addDoc(collection(db, "Products"), productData);
  }

  form.reset();
  uploadedImageURL = "";
  uploadStatus.textContent = "No file selected";
  loadProducts();
};

// ================= Handle Image Upload =================
dropArea.addEventListener("click", () => fileInput.click());

dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("highlight");
});

dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("highlight");
});

dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("highlight");
  const file = e.dataTransfer.files[0];
  handleFileUpload(file);
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  handleFileUpload(file);
});

async function handleFileUpload(file) {
  if (!file) return;

  const uniqueName = `${Date.now()}-${file.name}`;
  const fileRef = storageRef(storage, `product-images/${uniqueName}`);

  uploadStatus.textContent = "Uploading...";

  try {
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    uploadedImageURL = url;
    uploadStatus.textContent = "Upload complete!";
  } catch (err) {
    console.error("Upload failed", err);
    uploadStatus.textContent = "Upload failed.";
  }
}

// Load products initially
loadProducts();
