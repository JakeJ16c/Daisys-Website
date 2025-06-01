
// admin/products.js – Updated Product Management UI
import { auth, db } from '../firebase.js';
import {
  onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import {
  collection, getDocs, doc, getDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, endBefore, limitToLast, Timestamp
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

// DOM elements
const container = document.getElementById("productsTableContainer");
const productSearch = document.getElementById("productSearch");
const sortOrder = document.getElementById("sortOrder");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const logoutBtn = document.getElementById("logoutBtn");

// State
let currentProducts = [];
let lastVisible = null;
let firstVisible = null;
let currentPage = 1;
const pageSize = 10;
let currentSearch = "";
let currentSort = "newest";

// Auth gate
onAuthStateChanged(auth, user => {
  if (!user) location.href = "login.html";
  else loadProducts();
});

// Listeners
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

// Load and render
async function loadProducts(paginate = false, direction = 'next') {
  container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';

  let productsRef = collection(db, "Products");
  let qConstraints = [];

  let [sortField, sortDir] = (() => {
  switch (currentSort) {
    case "newest": return ["name", "asc"]; // TEMP: fallback until timestamps exist
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
    createdAt: doc.data().createdAt?.toDate?.() || new Date()
  }));

  if (currentSearch) {
    currentProducts = currentProducts.filter(p =>
      (p.name || "").toLowerCase().includes(currentSearch)
    );
  }

  renderProducts(currentProducts);
}

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

    card.querySelector('.edit-btn').onclick = () => viewProductDetails(product.id);
    card.querySelector('.delete-btn').onclick = () => confirmDelete(product.id);

    container.appendChild(card);
  });
}

function confirmDelete(id) {
  if (confirm("Delete this product?")) {
    deleteDoc(doc(db, "Products", id)).then(loadProducts);
  }
}

function debounce(fn, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

// === Product Modal Logic ===
const productModal = document.getElementById("productModal");
const closeProductModal = document.getElementById("closeProductModal");
const saveProductChanges = document.getElementById("saveProductChanges");

const modalName = document.getElementById("modalName");
const modalPrice = document.getElementById("modalPrice");
const modalStock = document.getElementById("modalStock");

let selectedProductId = null;

function viewProductDetails(productId) {
  const product = currentProducts.find(p => p.id === productId);
  if (!product) return;

  selectedProductId = product.id;

  // Populate form
  modalName.value = product.name || '';
  modalPrice.value = product.price || 0;
  modalStock.value = product.stock || 0;

  productModal.style.display = "block";
}

if (closeProductModal) {
  closeProductModal.onclick = () => {
    productModal.style.display = "none";
  };
}

if (saveProductChanges) {
  saveProductChanges.onclick = async () => {
    if (!selectedProductId) return;

    const updatedData = {
      name: modalName.value.trim(),
      price: parseFloat(modalPrice.value),
      stock: parseInt(modalStock.value),
    };

    try {
      await updateDoc(doc(db, "Products", selectedProductId), updatedData);
      productModal.style.display = "none";
      loadProducts();
    } catch (err) {
      console.error("Error updating product:", err);
      alert("Failed to save changes.");
    }
  };
}

window.addEventListener("click", e => {
  if (e.target === productModal) {
    productModal.style.display = "none";
  }
});

