// admin/products.js – Full Product Management UI with Add + Image Upload
import { auth, db } from '../firebase.js';
import {
  onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import {
  collection, getDocs, doc, getDoc, setDoc, addDoc, deleteDoc, updateDoc,
  query, orderBy, limit, startAfter, endBefore, limitToLast
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js';

// DOM elements
const container = document.getElementById("productsTableContainer");
const productSearch = document.getElementById("productSearch");
const sortOrder = document.getElementById("sortOrder");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const logoutBtn = document.getElementById("logoutBtn");
const addProductBtn = document.getElementById("addProductBtn");

const productModal = document.getElementById("productModal");
const closeProductModal = document.getElementById("closeProductModal");
const saveProductChanges = document.getElementById("saveProductChanges");
const modalName = document.getElementById("modalName");
const modalPrice = document.getElementById("modalPrice");
const modalStock = document.getElementById("modalStock");
let imageUpload = null;
const imageUploadInput = document.getElementById("imageUpload");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");

const storage = getStorage();

// State
let currentProducts = [];
let lastVisible = null;
let firstVisible = null;
let currentPage = 1;
const pageSize = 10;
let currentSearch = "";
let currentSort = "newest";
let selectedProductId = null;
let uploadedImages = [];

// Auth check
onAuthStateChanged(auth, user => {
  if (!user) location.href = "login.html";
  else loadProducts();
});

// UI Listeners
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
    uploadedImages = [];
    imagePreviewContainer.innerHTML = "";
    productModal.style.display = "flex";
  };
}

if (closeProductModal) {
  closeProductModal.onclick = () => {
    productModal.style.display = "none";
  };
}

window.addEventListener("click", e => {
  if (e.target === productModal) {
    productModal.style.display = "none";
  }
});

if (saveProductChanges) {
  saveProductChanges.onclick = async () => {
    const data = {
      name: modalName.value.trim(),
      price: parseFloat(modalPrice.value),
      stock: parseInt(modalStock.value),
      images: uploadedImages,
      updatedAt: new Date()
    };

    if (!data.name || isNaN(data.price)) {
      alert("Please fill all required fields.");
      return;
    }

    try {
      if (selectedProductId) {
        await updateDoc(doc(db, "Products", selectedProductId), data);
      } else {
        data.createdAt = new Date();
        await addDoc(collection(db, "Products"), data);
      }
      productModal.style.display = "none";
      loadProducts();
    } catch (err) {
      console.error("Error saving product:", err);
    }
  };
}

// Handle Image Upload
imageUploadInput?.addEventListener("change", async (e) => {
  const files = Array.from(e.target.files);
  for (const file of files) {
    const path = `products/${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, "_")}`;
    const imageRef = ref(storage, path);
    await uploadBytes(imageRef, file);
    const url = await getDownloadURL(imageRef);
    uploadedImages.push(url);

    const imgEl = document.createElement("img");
    imgEl.src = url;
    imgEl.style.cssText = "width:60px;height:60px;margin-right:8px;border-radius:6px;";
    imagePreviewContainer.appendChild(imgEl);
  }
  e.target.value = "";
});

// Load Products
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
    ...doc.data()
  }));

  if (currentSearch) {
    currentProducts = currentProducts.filter(p =>
      (p.name || "").toLowerCase().includes(currentSearch)
    );
  }

  renderProducts(currentProducts);
}

// Render
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
      <img src="${product.images?.[0] || '../icon-512.png'}" alt="${product.name}" style="
        width: 100px; height: 100px; object-fit: cover;
        border-radius: 50%; margin-bottom: 12px;">
      <h3 style="font-size: 1.1rem; margin: 8px 0;">${product.name}</h3>
      <p style="margin: 4px 0;"><strong>£${Number(product.price).toFixed(2)}</strong></p>
      <p style="margin: 4px 0; color: #777;">Stock: ${product.stock ?? 0}</p>
      <div style="margin-top: 10px; display: flex; gap: 10px;">
        <button class="edit-btn" data-id="${product.id}" style="
          padding: 6px 12px; border-radius: 6px;
          background: #204ECF; color: white; border: none;">Edit</button>
        <button class="delete-btn" data-id="${product.id}" style="
          padding: 6px 12px; border-radius: 6px;
          background: #f87171; color: white; border: none;">Delete</button>
      </div>
    `;

    const editBtn = card.querySelector('.edit-btn');
      if (editBtn) {
        editBtn.onclick = () => {
          selectedProductId = product.id;
          modalName.value = product.name || "";
          modalPrice.value = product.price || "";
          modalStock.value = product.stock || "";
          uploadedImages = product.images || [];
          imagePreviewContainer.innerHTML = "";
          uploadedImages.forEach((url) => {
            const img = document.createElement("img");
            img.src = url;
            img.style.cssText = "width:60px;height:60px;margin-right:8px;border-radius:6px;";
            imagePreviewContainer.appendChild(img);
          });
          productModal.style.display = "flex";
        };
      }

    const deleteBtn = card.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.onclick = () => {
          if (confirm("Delete this product?")) {
            deleteDoc(doc(db, "Products", product.id)).then(loadProducts);
          }
        };
      }
    
    container.appendChild(card);
  });
}

function debounce(fn, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}
