// admin/products.js – Full Product Management UI with Category dropdown + “Add new…”
// =====================================================================================
// NEW: Adds a Category <select> with a bottom option “+ Add new category…”
// - Adds helpers ensureCategorySelect(), loadCategoryOptions(), onCategoryChange()
// - Persists categories in Firestore collection "Categories" (doc id = slug)
// - Restores previous selection if user cancels
// =====================================================================================

import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import {
  collection, getDocs, doc, getDoc, setDoc, addDoc, deleteDoc, updateDoc,
  query, orderBy, limit, startAfter, endBefore, limitToLast
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js';

// =======================
// DOM elements
// =======================
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
const modalDescription = document.getElementById("modalDescription");
const oneSizeYes = document.getElementById("oneSizeYes");
const oneSizeNo = document.getElementById("oneSizeNo");
const dynamicSizeList = document.getElementById("dynamicSizeList");
let imageUpload = null;
const imageUploadInput = document.getElementById("imageUpload");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");

// ---- Category dropdown support
const modalCategory = document.getElementById("modalCategory"); // if present in HTML
let categorySelectEl = modalCategory;                           // will be set/created
let allCategories = [];                                         // cache after load
let lastSelectedCategory = "";                                  // restore on cancel
let categoryChangeBound = false;                                // bind once

const storage = getStorage();

// =======================
// State
// =======================
let currentProducts = [];
let lastVisible = null;
let firstVisible = null;
let currentPage = 1;
const pageSize = 10;
let currentSearch = "";
let currentSort = "newest";
let selectedProductId = null;
let uploadedImages = [];

// =======================
// Auth check
// =======================
onAuthStateChanged(auth, user => {
  if (!user) location.href = "login.html";
  else loadProducts();
});

// =======================
// UI Listeners
// =======================
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

// =======================
// Category dropdown helpers
// =======================
async function ensureCategorySelect() {
  if (categorySelectEl) return;

  categorySelectEl = document.createElement("select");
  categorySelectEl.id = "modalCategory";
  categorySelectEl.className = "form-control";

  const label = document.createElement("label");
  label.textContent = "Category";
  label.style.display = "block";
  label.style.marginTop = "12px";

  const anchor =
    document.querySelector("#productModal [data-category-anchor]") ||
    document.querySelector("#productModal .form-group") ||
    document.querySelector("#productModal .modal-content") ||
    productModal;

  anchor.insertAdjacentElement("afterend", categorySelectEl);
  anchor.insertAdjacentElement("afterend", label);
}

async function loadCategoryOptions() {
  await ensureCategorySelect();

  allCategories = [];
  try {
    const catsSnap = await getDocs(collection(db, "Categories"));
    catsSnap.forEach(d => {
      const n = (d.data()?.name || "").trim();
      if (n) allCategories.push(n);
    });
  } catch (e) {
    console.warn("Categories collection not found – will fallback to inferred set.");
  }

  if (allCategories.length === 0 && Array.isArray(currentProducts)) {
    const s = new Set();
    currentProducts.forEach(p => { if (p?.category) s.add(p.category); });
    allCategories = Array.from(s);
  }

  if (allCategories.length === 0) {
    allCategories = ["T-Shirts", "Bracelets", "Necklaces", "Rings", "Accessories"];
  }

  const baseOptions =
    `<option value="">Select category…</option>` +
    allCategories.map(c => `<option value="${c}">${c}</option>`).join("") +
    `<option value="__add_new__">+ Add new category…</option>`;  // NEW

  categorySelectEl.innerHTML = baseOptions;

  // restore previous selection if any
  if (lastSelectedCategory) {
    const exists = allCategories.some(c => c === lastSelectedCategory);
    categorySelectEl.value = exists ? lastSelectedCategory : "";
  }

  if (!categoryChangeBound) {
    categorySelectEl.addEventListener("change", onCategoryChange);
    categoryChangeBound = true;
  }
}

async function onCategoryChange(e) {
  if (e.target.value !== "__add_new__") {
    lastSelectedCategory = e.target.value || "";
    return;
  }

  const entered = (prompt("Enter a new category name:") || "").trim();
  if (!entered) {
    categorySelectEl.value = lastSelectedCategory || "";
    return;
  }

  const newName = entered.replace(/\s+/g, " ").trim();
  const already = allCategories.find(c => c.toLowerCase() === newName.toLowerCase());
  if (already) {
    lastSelectedCategory = already;
    categorySelectEl.value = already;
    return;
  }

  try {
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    await setDoc(doc(db, "Categories", slug), {
      name: newName,
      createdAt: new Date()
    });

    allCategories.push(newName);
    await loadCategoryOptions();
    categorySelectEl.value = newName;
    lastSelectedCategory = newName;
  } catch (err) {
    console.error("Failed to add category:", err);
    alert("Could not add category. Please try again.");
    categorySelectEl.value = lastSelectedCategory || "";
  }
}

// -----------------------------------------------------------------------------

if (addProductBtn) {
  addProductBtn.onclick = async () => {
    selectedProductId = null;
    modalName.value = "";
    modalPrice.value = "";
    modalStock.value = "";
    modalDescription.value = "";
    uploadedImages = [];
    imagePreviewContainer.innerHTML = "";

    await loadCategoryOptions();
    if (categorySelectEl) categorySelectEl.value = "";
    lastSelectedCategory = ""; // NEW

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
    const oneSize = oneSizeYes.checked;
    const stock = oneSize
      ? parseInt(modalStock.value || "0")
      : (() => {
          const sizeInputs = document.querySelectorAll("#dynamicSizeList input[name^='stock_']");
          const stockObj = {};
          sizeInputs.forEach(input => {
            const size = input.name.replace("stock_", "");
            const qty = parseInt(input.value || "0");
            if (!isNaN(qty)) stockObj[size] = qty;
          });
          return stockObj;
        })();

    const data = {
      name: modalName.value.trim(),
      price: parseFloat(modalPrice.value),
      stock,
      oneSizeOnly: oneSize,
      description: modalDescription.value.trim(),
      images: uploadedImages,
      category: (categorySelectEl?.value || "").trim(),   // NEW
      updatedAt: new Date()
    };

    if (!data.name || isNaN(data.price)) {
      alert("Please fill all required fields.");
      return;
    }
    if (!data.category) {
      alert("Please choose a category.");
      return;
    }
    if (!oneSize && Object.keys(data.stock).length === 0) {
      alert("Please add at least one size with stock.");
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

// =======================
// Handle Image Upload
// =======================
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

// =======================
// Load Products
// =======================
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

  currentProducts = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  if (currentSearch) {
    currentProducts = currentProducts.filter(p =>
      (p.name || "").toLowerCase().includes(currentSearch)
    );
  }

  // refresh categories (improves fallback inference)
  try { await loadCategoryOptions(); } catch (_) {}

  renderProducts(currentProducts);
}

// =======================
// Render
// =======================
function renderProducts(products) {
  container.innerHTML = "";
  const archivedContainer = document.getElementById("ArchivedproductsTableContainer");
  if (archivedContainer) archivedContainer.innerHTML = ""; // Clear previous archive list

  // Personalised toggle card
  const toggleCard = document.createElement("div");
  toggleCard.className = "product-card";
  toggleCard.style.cssText = `
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

  toggleCard.innerHTML = `
    <img src="../IMG_8861.png" alt="Personalised Design" style="
      width: 100px; height: 100px; object-fit: cover;
      border-radius: 50%; margin-bottom: 12px;">
    <h3 style="font-size: 1.1rem; margin: 8px 0;">Personalised Design</h3>
    <p style="margin: 4px 0;"><strong>Show personalised design page ?</strong></p>
    <label class="switch">
      <input type="checkbox" id="personalisedToggle">
      <span class="slider round"></span>
    </label>
  `;

  (async () => {
    const toggle = toggleCard.querySelector("#personalisedToggle");
    const settingsRef = doc(db, "SiteSettings", "design");

    try {
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        toggle.checked = snap.data().personalisedDesignEnabled ?? false;
      }

      toggle.addEventListener("change", async () => {
        await setDoc(settingsRef, {
          personalisedDesignEnabled: toggle.checked
        }, { merge: true });
      });
    } catch (err) {
      console.error("❌ Failed to load personalised toggle:", err);
    }
  })();

  container.appendChild(toggleCard);

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
      align-items: center;
      justify-content: space-between;
      text-align: left;
    `;

    card.innerHTML = `
      <div style="display: flex; align-items: center; width: 100%;">
        <img src="${product.images?.[0] || '../icon-512.png'}" alt="${product.name}" style="
          width: 80px; height: 80px; object-fit: cover;
          border-radius: 12px; margin-right: 16px; flex-shrink: 0;">
        
        <div style="flex-grow: 1;">
          <h3 style="margin: 0; font-size: 1.1rem;">${product.name}</h3>
          <p style="margin: 4px 0;"><strong>£${Number(product.price).toFixed(2)}</strong></p>
          <p style="margin: 4px 0; color: #777;">Stock: ${typeof product.stock === 'object' ? Object.values(product.stock).reduce((a,b)=>a+b,0) : product.stock ?? 0}</p>
          ${product.category ? `<p style="margin: 2px 0; color:#555;">Category: ${product.category}</p>` : ""}
        </div>
    
        <div style="display: flex; gap: 8px;">
          <button class="edit-btn" data-id="${product.id}" style="
            padding: 6px 10px; border-radius: 6px;
            background: #204ECF; color: white; border: none;">Edit</button>
          <button class="delete-btn" data-id="${product.id}" style="
            padding: 6px 10px; border-radius: 6px;
            background: #f87171; color: white; border: none;">Delete</button>
          <button class="archive-btn" data-id="${product.id}" style="
            padding: 6px 10px; border-radius: 6px;
            background: #e0e0e0; color: black; border: none;">
            ${product.archived ? 'Unarchive' : 'Archive'}
          </button>
        </div>
      </div>
    `;

    // Edit
    card.querySelector('.edit-btn').onclick = async () => {
      selectedProductId = product.id;
      modalName.value = product.name || "";
      modalPrice.value = product.price || "";
      modalDescription.value = product.description || "";
      uploadedImages = product.images || [];
      imagePreviewContainer.innerHTML = "";
      uploadedImages.forEach((url) => {
        const img = document.createElement("img");
        img.src = url;
        img.style.cssText = "width:60px;height:60px;margin-right:8px;border-radius:6px;";
        imagePreviewContainer.appendChild(img);
      });

      await loadCategoryOptions();
      if (categorySelectEl) categorySelectEl.value = product.category || "";
      lastSelectedCategory = product.category || ""; // NEW

      if (product.oneSizeOnly) {
        oneSizeYes.checked = true;
        oneSizeYes.dispatchEvent(new Event("change"));
        modalStock.value = typeof product.stock === 'number' ? product.stock : "";
      } else {
        oneSizeNo.checked = true;
        oneSizeNo.dispatchEvent(new Event("change"));
        dynamicSizeList.innerHTML = '';
        Object.entries(product.stock || {}).forEach(([size, qty]) => {
          const row = document.createElement("div");
          row.classList.add("form-group");
          row.innerHTML = `
            <label>Size ${size}</label>
            <input type="number" name="stock_${size}" value="${qty}" placeholder="Qty" class="form-control" />
          `;
          dynamicSizeList.appendChild(row);
        });
      }

      productModal.style.display = "flex";
    };

    // Delete
    card.querySelector('.delete-btn').onclick = () => {
      if (confirm("Delete this product?")) {
        deleteDoc(doc(db, "Products", product.id)).then(loadProducts);
      }
    };

    // Archive/Unarchive
    card.querySelector('.archive-btn').onclick = async () => {
      await updateDoc(doc(db, "Products", product.id), {
        archived: !product.archived
      });
      loadProducts();
    };

    const archivedContainer = document.getElementById("ArchivedproductsTableContainer");
    if (product.archived && archivedContainer) {
      archivedContainer.appendChild(card);
    } else {
      container.appendChild(card);
    }
  });
}

// =======================
// Utils
// =======================
function debounce(fn, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}
