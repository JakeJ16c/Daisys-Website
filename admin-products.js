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

// ================= Initialize Firebase =================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ================= DOM Element References =================
const form = document.getElementById('productForm');
const productList = document.getElementById('productList');
const dropArea = document.getElementById("drop-area");
const fileInput = document.getElementById("imageFileInput");
const uploadStatus = document.getElementById("uploadStatus");

// 💾 For storing uploaded image URL
let uploadedImageURL = "";

// 👁️ Add image preview element
const imagePreview = document.createElement("img");
imagePreview.style.maxWidth = "100px";
imagePreview.style.marginTop = "10px";
imagePreview.style.display = "none";
dropArea.appendChild(imagePreview);

// ================= Load & Render Products =================
async function loadProducts() {
  productList.innerHTML = '';
  const snapshot = await getDocs(collection(db, "Products"));

  snapshot.forEach((product) => {
    const data = product.data();

    const li = document.createElement('li');
    li.innerHTML = `
      <div style="display:flex; align-items:center; gap:1rem;">
        <img src="${data.image}" alt="${data.name}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;" />
        <span><strong>${data.name}</strong> - £${parseFloat(data.price).toFixed(2)}</span>
      </div>
      <div>
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </div>`;

    // 🗑️ Delete Button Functionality
    li.querySelector('.delete-btn').onclick = async () => {
      await deleteDoc(doc(db, "Products", product.id));
      loadProducts();
    };

    // ✏️ Edit Button Functionality
    li.querySelector('.edit-btn').onclick = () => {
      document.getElementById('title').value = data.name;
      document.getElementById('price').value = data.price;
      document.getElementById('description').value = data.description;

      uploadedImageURL = data.image;
      imagePreview.src = uploadedImageURL;
      imagePreview.style.display = 'block';
      uploadStatus.textContent = "Image loaded (editing)";
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

  // Reset form + state
  form.reset();
  uploadedImageURL = "";
  uploadStatus.textContent = "No file selected";
  imagePreview.style.display = 'none';
  loadProducts();
};

// ================= Image Upload Logic =================

// 🖱️ Clicking on drop area triggers file selector
dropArea.addEventListener("click", () => fileInput.click());

// 🖱️ Dragging file over drop area highlights it
dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("highlight");
});

// 🖱️ Dragging file out of area removes highlight
dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("highlight");
});

// 🖱️ Dropping file onto drop area triggers upload
dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("highlight");
  const file = e.dataTransfer.files[0];
  handleFileUpload(file);
});

// 📁 Selecting file from input triggers upload
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  handleFileUpload(file);
});

// 📤 Upload image to Firebase Storage
async function handleFileUpload(file) {
  if (!file) return;

  const uniqueName = `${Date.now()}-${file.name}`;
  const fileRef = storageRef(storage, `product-images/${uniqueName}`);

  uploadStatus.textContent = "Uploading...";

  try {
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    uploadedImageURL = url;

    // Show uploaded preview
    imagePreview.src = uploadedImageURL;
    imagePreview.style.display = 'block';
    uploadStatus.textContent = "Upload complete!";
  } catch (err) {
    console.error("Upload failed", err);
    uploadStatus.textContent = "Upload failed.";
  }
}

// ================= Init =================
loadProducts();
