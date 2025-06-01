
// admin/products.js – Full Product Management UI with Add + Edit + Image Upload

import { auth, db } from '../firebase.js';
import {
  onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import {
  collection, getDocs, doc, getDoc, deleteDoc, updateDoc, addDoc,
  query, orderBy, limit, startAfter, endBefore, limitToLast, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js';

// === DOM ELEMENTS ===
const container = document.getElementById("productsTableContainer");
const productSearch = document.getElementById("productSearch");
const sortOrder = document.getElementById("sortOrder");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const logoutBtn = document.getElementById("logoutBtn");
const addProductBtn = document.getElementById("addProductBtn");

// === MODAL ELEMENTS ===
const productModal = document.getElementById("productModal");
const closeProductModal = document.getElementById("closeProductModal");
const saveProductChanges = document.getElementById("saveProductChanges");
const modalName = document.getElementById("modalName");
const modalPrice = document.getElementById("modalPrice");
const modalStock = document.getElementById("modalStock");
const modalImages = document.getElementById("modalImages");

// === STATE ===
let currentProducts = [];
let lastVisible = null;
let firstVisible = null;
let currentPage = 1;
const pageSize = 10;
let currentSearch = "";
let currentSort = "newest";
let selectedProductId = null;
let imageFiles = [];

// === AUTH CHECK ===
onAuthStateChanged(auth, user => {
  if (!user) location.href = "login.html";
  else loadProducts();
});

// === EVENT LISTENERS ===
if (logoutBtn) logoutBtn.onclick = async () => {
  await signOut(auth);
  location.href = "login.html";
};

if (productSearch) {
  productSearch.addEventListener("input", debounce(() => {
    currentSearch = productSearch.value.toLowerCase().trim();
    currentPage = 1;
    loadProducts();
  }, 300));
}

if (sortOrder) sortOrder.onchange = () => {
  currentSort = sortOrder.value;
  currentPage = 1;
  loadProducts();
};

if (prevPageBtn) prevPageBtn.onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    loadProducts(true, 'prev');
  }
};

if (nextPageBtn) nextPageBtn.onclick = () => {
  currentPage++;
  loadProducts(true, 'next');
};

if (addProductBtn) {
  addProductBtn.onclick = () => {
    selectedProductId = null;
    modalName.value = "";
    modalPrice.value = "";
    modalStock.value = "";
    if (modalImages) modalImages.value = "";
    imageFiles = [];
    productModal.style.display = "flex";
    document.getElementById("productModalTitle").innerText = "Add New Product";
  };
}

if (closeProductModal) {
  closeProductModal.onclick = () => {
    productModal.style.display = "none";
  };
}

// === SAVE/UPDATE PRODUCT ===
if (saveProductChanges) {
  saveProductChanges.onclick = async () => {
    const name = modalName.value.trim();
    const price = parseFloat(modalPrice.value);
    const stock = parseInt(modalStock.value);

    if (!name || isNaN(price)) {
      alert("Name and price are required");
      return;
    }

    try {
      let imageUrls = [];
      const storage = getStorage();

      if (modalImages.files.length > 0) {
        for (let file of modalImages.files) {
          const imgRef = ref(storage, 'product-images/' + file.name + '_' + Date.now());
          const snapshot = await uploadBytes(imgRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          imageUrls.push(downloadURL);
        }
      }

      const productData = {
        name,
        price,
        stock: isNaN(stock) ? 0 : stock,
        images: imageUrls,
        createdAt: serverTimestamp()
      };

      if (selectedProductId) {
        await updateDoc(doc(db, "Products", selectedProductId), productData);
      } else {
        await addDoc(collection(db, "Products"), productData);
      }

      productModal.style.display = "none";
      loadProducts();
    } catch (err) {
      console.error("Failed to save:", err);
      alert("Something went wrong.");
    }
  };
}

// === CLICK OUTSIDE TO CLOSE ===
window.addEventListener("click", e => {
  if (e.target === productModal) {
    productModal.style.display = "none";
  }
});

// === PRODUCT LOADING ===
async function loadProducts(paginate = false, direction = 'next') {
  container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

  let productsRef = collection(db, "Products");
  let qConstraints = [];

  let [sortField, sortDir] = (() => {
    switch (currentSort) {
      case "newest": return ["name", "asc"];
      case "oldest": return ["name", "desc"];
      case "highest": return ["price", "desc"];
      case "lowest": return ["price", "asc"];
      default: return ["name", "asc"];
    }
  })();

  qConstraints.push(orderBy(sortField, sortDir));

  if (paginate) {
    if (direction === "next" && lastVisible) qConstraints.push(startAfter(lastVisible));
    else if (direction === "prev" && firstVisible) {
      qConstraints.push(endBefore(firstVisible));
      qConstraints.push(limitToLast(pageSize));
    }
  }

  qConstraints.push(limit(pageSize));

  const q = query(productsRef, ...qConstraints);
  const snap = await getDocs(q);

  if (snap.empty) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><h3>No products</h3></div>';
    return;
  }

  firstVisible = snap.docs[0];
  lastVisible = snap.docs[snap.docs.length - 1];

  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = snap.docs.length < pageSize;

  currentProducts = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  if (currentSearch) {
    currentProducts = currentProducts.filter(p =>
      (p.name || "").toLowerCase().includes(currentSearch)
    );
  }

  renderProducts(currentProducts);
}

// === RENDER PRODUCTS ===
function renderProducts(products) {
  container.innerHTML = "";

  products.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.style.cssText = `
      background: white;
      border-radius: 12px;
      margin: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    `;

    card.innerHTML = `
      <img src="${product.images?.[0] || '../icon-512.png'}" alt="${product.name}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 50%; margin-bottom: 12px;">
      <h3 style="font-size: 1.1rem; margin: 8px 0;">${product.name}</h3>
      <p style="margin: 4px 0;"><strong>£${Number(product.price).toFixed(2)}</strong></p>
      <p style="margin: 4px 0; color: #777;">Stock: ${product.stock ?? 0}</p>
      <div style="margin-top: 10px; display: flex; gap: 10px;">
        <button class="edit-btn" data-id="${product.id}" style="padding: 6px 12px; border-radius: 6px; background: #204ECF; color: white; border: none;">Edit</button>
        <button class="delete-btn" data-id="${product.id}" style="padding: 6px 12px; border-radius: 6px; background: #f87171; color: white; border: none;">Delete</button>
      </div>
    `;

    card.querySelector('.edit-btn').onclick = () => viewProductDetails(product.id);
    card.querySelector('.delete-btn').onclick = () => confirmDelete(product.id);

    container.appendChild(card);
  });
}

// === EDIT PRODUCT ===
function viewProductDetails(productId) {
  const product = currentProducts.find(p => p.id === productId);
  if (!product) return;

  selectedProductId = product.id;
  modalName.value = product.name || '';
  modalPrice.value = product.price || '';
  modalStock.value = product.stock || 0;
  if (modalImages) modalImages.value = "";
  imageFiles = [];
  document.getElementById("productModalTitle").innerText = "Edit Product";
  productModal.style.display = "flex";
}

// === DELETE PRODUCT ===
function confirmDelete(id) {
  if (confirm("Delete this product?")) {
    deleteDoc(doc(db, "Products", id)).then(loadProducts);
  }
}

// === UTILITY ===
function debounce(fn, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}
