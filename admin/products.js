// products.js - Product Management functionality for admin dashboard
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  endBefore,
  limitToLast,
  Timestamp,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject 
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js';

// DOM Elements
const productsTableContainer = document.getElementById('productsTableContainer');
const productSearch = document.getElementById('productSearch');
const categoryFilter = document.getElementById('categoryFilter');
const stockFilter = document.getElementById('stockFilter');
const sortOrder = document.getElementById('sortOrder');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const productDetailModal = document.getElementById('productDetailModal');
const productDetailContent = document.getElementById('productDetailContent');
const modalTitle = document.getElementById('modalTitle');
const saveProductBtn = document.getElementById('saveProductBtn');
const deleteProductBtn = document.getElementById('deleteProductBtn');
const addProductBtn = document.getElementById('addProductBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize Firebase Storage
const storage = getStorage();

// State variables
let currentProducts = [];
let lastVisible = null;
let firstVisible = null;
let currentPage = 1;
let currentProductsPerPage = 10;
let currentCategoryFilter = 'all';
let currentStockFilter = 'all';
let currentSort = 'newest';
let currentSearchTerm = '';
let currentProductDetail = null;
let isNewProduct = false;
let uploadedImages = [];
let deletedImages = [];

// Auth check
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    loadProducts();
  }
});

// Logout button
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await signOut(auth);
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  });
}

// Event listeners
if (productSearch) {
  productSearch.addEventListener('input', debounce(() => {
    currentSearchTerm = productSearch.value.trim().toLowerCase();
    currentPage = 1;
    loadProducts();
  }, 300));
}

if (categoryFilter) {
  categoryFilter.addEventListener('change', () => {
    currentCategoryFilter = categoryFilter.value;
    currentPage = 1;
    loadProducts();
  });
}

if (stockFilter) {
  stockFilter.addEventListener('change', () => {
    currentStockFilter = stockFilter.value;
    currentPage = 1;
    loadProducts();
  });
}

if (sortOrder) {
  sortOrder.addEventListener('change', () => {
    currentSort = sortOrder.value;
    currentPage = 1;
    loadProducts();
  });
}

if (prevPageBtn) {
  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadProducts(true, 'prev');
    }
  });
}

if (nextPageBtn) {
  nextPageBtn.addEventListener('click', () => {
    currentPage++;
    loadProducts(true, 'next');
  });
}

if (saveProductBtn) {
  saveProductBtn.addEventListener('click', saveProductChanges);
}

if (deleteProductBtn) {
  deleteProductBtn.addEventListener('click', deleteProduct);
}

if (addProductBtn) {
  addProductBtn.addEventListener('click', showAddProductForm);
}

// Load products from Firestore
async function loadProducts(paginate = false, direction = 'next') {
  showLoading();
  
  try {
    let productsRef = collection(db, "Products");
    let productsQuery;
    
    // Apply sorting
    let orderByField, orderByDirection;
    switch (currentSort) {
      case 'newest':
        orderByField = 'createdAt';
        orderByDirection = 'desc';
        break;
      case 'oldest':
        orderByField = 'createdAt';
        orderByDirection = 'asc';
        break;
      case 'highest':
        orderByField = 'price';
        orderByDirection = 'desc';
        break;
      case 'lowest':
        orderByField = 'price';
        orderByDirection = 'asc';
        break;
      case 'name-asc':
        orderByField = 'name';
        orderByDirection = 'asc';
        break;
      case 'name-desc':
        orderByField = 'name';
        orderByDirection = 'desc';
        break;
      default:
        orderByField = 'createdAt';
        orderByDirection = 'desc';
    }
    
    // Build query
    let queryConstraints = [];
    
    if (currentCategoryFilter !== 'all') {
      queryConstraints.push(where('category', '==', currentCategoryFilter));
    }
    
    if (currentStockFilter !== 'all') {
      switch (currentStockFilter) {
        case 'in':
          queryConstraints.push(where('stock', '>', 5));
          break;
        case 'low':
          queryConstraints.push(where('stock', '>', 0));
          queryConstraints.push(where('stock', '<=', 5));
          break;
        case 'out':
          queryConstraints.push(where('stock', '==', 0));
          break;
      }
    }
    
    queryConstraints.push(orderBy(orderByField, orderByDirection));
    
    // Apply pagination
    if (paginate) {
      if (direction === 'next' && lastVisible) {
        queryConstraints.push(startAfter(lastVisible));
      } else if (direction === 'prev' && firstVisible) {
        queryConstraints.push(endBefore(firstVisible));
        queryConstraints.push(limitToLast(currentProductsPerPage));
      } else {
        queryConstraints.push(limit(currentProductsPerPage));
      }
    } else {
      queryConstraints.push(limit(currentProductsPerPage));
    }
    
    productsQuery = query(productsRef, ...queryConstraints);
    
    const snapshot = await getDocs(productsQuery);
    
    if (snapshot.empty) {
      showEmptyState();
      prevPageBtn.disabled = currentPage === 1;
      nextPageBtn.disabled = true;
      return;
    }
    
    // Update pagination cursors
    firstVisible = snapshot.docs[0];
    lastVisible = snapshot.docs[snapshot.docs.length - 1];
    
    // Update pagination buttons
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = snapshot.docs.length < currentProductsPerPage;
    
    // Process products
    currentProducts = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to JS Date objects
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
      };
    });
    
    // Apply search filter in memory (if needed)
    if (currentSearchTerm) {
      currentProducts = currentProducts.filter(product => 
        product.id.toLowerCase().includes(currentSearchTerm) ||
        product.name.toLowerCase().includes(currentSearchTerm) ||
        (product.description && product.description.toLowerCase().includes(currentSearchTerm))
      );
    }
    
    renderProductsTable();
    
  } catch (error) {
    console.error('Error loading products:', error);
    showErrorState();
  }
}

// Render products table
function renderProductsTable() {
  if (currentProducts.length === 0) {
    showEmptyState();
    return;
  }
  
  const tableHTML = `
    <table class="products-table">
      <thead>
        <tr>
          <th>Image</th>
          <th>Name</th>
          <th>Category</th>
          <th>Price</th>
          <th>Stock</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${currentProducts.map(product => `
          <tr>
            <td>
              <img src="${getProductImage(product)}" alt="${product.name}" class="product-image">
            </td>
            <td class="product-name">${product.name}</td>
            <td>${getCategoryBadge(product.category)}</td>
            <td class="product-price">£${formatPrice(product.price || 0)}</td>
            <td>
              <span class="product-stock ${getStockStatusClass(product.stock)}">${getStockStatusText(product.stock)}</span>
            </td>
            <td>
              <button class="action-btn view-product" data-id="${product.id}" title="Edit Product">
                <i class="fas fa-edit"></i>
              </button>
              <button class="action-btn duplicate-product" data-id="${product.id}" title="Duplicate Product">
                <i class="fas fa-copy"></i>
              </button>
              <button class="action-btn delete-product" data-id="${product.id}" title="Delete Product">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  productsTableContainer.innerHTML = tableHTML;
  
  // Add event listeners to action buttons
  document.querySelectorAll('.view-product').forEach(button => {
    button.addEventListener('click', () => viewProductDetails(button.dataset.id));
  });
  
  document.querySelectorAll('.duplicate-product').forEach(button => {
    button.addEventListener('click', () => duplicateProduct(button.dataset.id));
  });
  
  document.querySelectorAll('.delete-product').forEach(button => {
    button.addEventListener('click', () => confirmDeleteProduct(button.dataset.id));
  });
}

// Get product image (first image or placeholder)
function getProductImage(product) {
  if (product.images && product.images.length > 0) {
    return product.images[0];
  }
  return '../icon-512.png'; // Default placeholder
}

// Get category badge HTML
function getCategoryBadge(category) {
  if (!category) return '<span class="category-badge">Uncategorized</span>';
  return `<span class="category-badge">${capitalizeFirstLetter(category)}</span>`;
}

// Get stock status class
function getStockStatusClass(stock) {
  if (stock === undefined || stock === null) return 'stock-out';
  if (stock <= 0) return 'stock-out';
  if (stock <= 5) return 'stock-low';
  return 'stock-in';
}

// Get stock status text
function getStockStatusText(stock) {
  if (stock === undefined || stock === null) return 'Out of Stock';
  if (stock <= 0) return 'Out of Stock';
  if (stock <= 5) return `Low Stock (${stock})`;
  return `In Stock (${stock})`;
}

// View product details
async function viewProductDetails(productId) {
  try {
    showModalLoading();
    productDetailModal.style.display = 'block';
    modalTitle.textContent = 'Edit Product';
    isNewProduct = false;
    
    const productRef = doc(db, "Products", productId);
    const productSnap = await getDoc(productRef);
    
    if (!productSnap.exists()) {
      productDetailContent.innerHTML = '<div class="empty-state"><h3>Product not found</h3></div>';
      return;
    }
    
    const productData = productSnap.data();
    currentProductDetail = {
      id: productId,
      ...productData,
      createdAt: productData.createdAt instanceof Timestamp ? productData.createdAt.toDate() : new Date(),
      updatedAt: productData.updatedAt instanceof Timestamp ? productData.updatedAt.toDate() : new Date(),
    };
    
    // Reset uploaded and deleted images arrays
    uploadedImages = [];
    deletedImages = [];
    
    renderProductForm(currentProductDetail);
    
  } catch (error) {
    console.error('Error loading product details:', error);
    productDetailContent.innerHTML = '<div class="empty-state"><h3>Error loading product details</h3></div>';
  }
}

// Show add product form
function showAddProductForm() {
  productDetailModal.style.display = 'block';
  modalTitle.textContent = 'Add New Product';
  isNewProduct = true;
  
  // Create empty product template
  currentProductDetail = {
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category: '',
    images: [],
    featured: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Reset uploaded and deleted images arrays
  uploadedImages = [];
  deletedImages = [];
  
  renderProductForm(currentProductDetail);
}

// Duplicate product
async function duplicateProduct(productId) {
  try {
    showModalLoading();
    productDetailModal.style.display = 'block';
    modalTitle.textContent = 'Duplicate Product';
    isNewProduct = true;
    
    const productRef = doc(db, "Products", productId);
    const productSnap = await getDoc(productRef);
    
    if (!productSnap.exists()) {
      productDetailContent.innerHTML = '<div class="empty-state"><h3>Product not found</h3></div>';
      return;
    }
    
    const productData = productSnap.data();
    currentProductDetail = {
      ...productData,
      name: `${productData.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Reset uploaded and deleted images arrays
    uploadedImages = [];
    deletedImages = [];
    
    renderProductForm(currentProductDetail);
    
  } catch (error) {
    console.error('Error duplicating product:', error);
    productDetailContent.innerHTML = '<div class="empty-state"><h3>Error duplicating product</h3></div>';
  }
}

// Confirm delete product
function confirmDeleteProduct(productId) {
  if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
    deleteProductById(productId);
  }
}

// Delete product by ID
async function deleteProductById(productId) {
  try {
    const productRef = doc(db, "Products", productId);
    
    // Get product data to delete images
    const productSnap = await getDoc(productRef);
    if (productSnap.exists()) {
      const productData = productSnap.data();
      
      // Delete product images from storage
      if (productData.images && productData.images.length > 0) {
        for (const imageUrl of productData.images) {
          try {
            // Extract the file path from the URL
            const imagePath = decodeURIComponent(imageUrl.split('/o/')[1].split('?')[0]);
            const imageRef = ref(storage, imagePath);
            await deleteObject(imageRef);
          } catch (error) {
            console.error('Error deleting image:', error);
            // Continue with other images even if one fails
          }
        }
      }
    }
    
    // Delete the product document
    await deleteDoc(productRef);
    
    // Reload products
    loadProducts();
    
    // Close modal if open
    productDetailModal.style.display = 'none';
    
    // Show success message
    alert('Product deleted successfully');
    
  } catch (error) {
    console.error('Error deleting product:', error);
    alert('Error deleting product');
  }
}

// Delete product (from modal)
function deleteProduct() {
  if (!currentProductDetail || isNewProduct) return;
  
  if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
    deleteProductById(currentProductDetail.id);
  }
}

// Render product form in modal
function renderProductForm(product) {
  const formHTML = `
    <form id="productForm">
      <div class="product-detail-section">
        <h4>Basic Information</h4>
        <div class="form-group">
          <label for="productName" class="form-label">Product Name</label>
          <input type="text" id="productName" class="form-control" value="${product.name || ''}" required>
        </div>
        
        <div class="form-group">
          <label for="productDescription" class="form-label">Description</label>
          <textarea id="productDescription" class="form-control">${product.description || ''}</textarea>
        </div>
        
        <div class="product-info-grid">
          <div class="form-group">
            <label for="productPrice" class="form-label">Price (£)</label>
            <input type="number" id="productPrice" class="form-control" value="${product.price || 0}" min="0" step="0.01" required>
          </div>
          
          <div class="form-group">
            <label for="productStock" class="form-label">Stock Quantity</label>
            <input type="number" id="productStock" class="form-control" value="${product.stock || 0}" min="0" step="1">
          </div>
          
          <div class="form-group">
            <label for="productCategory" class="form-label">Category</label>
            <select id="productCategory" class="form-control">
              <option value="">Select Category</option>
              <option value="necklaces" ${product.category === 'necklaces' ? 'selected' : ''}>Necklaces</option>
              <option value="bracelets" ${product.category === 'bracelets' ? 'selected' : ''}>Bracelets</option>
              <option value="earrings" ${product.category === 'earrings' ? 'selected' : ''}>Earrings</option>
              <option value="rings" ${product.category === 'rings' ? 'selected' : ''}>Rings</option>
              <option value="other" ${product.category === 'other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Featured Product</label>
            <div>
              <label>
                <input type="checkbox" id="productFeatured" ${product.featured ? 'checked' : ''}>
                Display as featured product
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <div class="product-detail-section">
        <h4>Product Images</h4>
        <div class="product-image-gallery" id="productImageGallery">
          ${renderProductImages(product.images || [])}
          <div class="add-image-btn" id="addImageBtn">
            <i class="fas fa-plus"></i> Add Image
          </div>
        </div>
        <input type="file" id="imageUpload" accept="image/*" style="display: none;" multiple>
      </div>
    </form>
  `;
  
  productDetailContent.innerHTML = formHTML;
  
  // Add event listeners for image upload
  document.getElementById('addImageBtn').addEventListener('click', () => {
    document.getElementById('imageUpload').click();
  });
  
  document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
  
  // Add event listeners for image removal
  document.querySelectorAll('.remove-image').forEach(button => {
    button.addEventListener('click', (e) => {
      const imageUrl = e.target.closest('.product-gallery-item').dataset.url;
      removeProductImage(imageUrl);
    });
  });
}

// Render product images
function renderProductImages(images) {
  if (!images || images.length === 0) {
    return '';
  }
  
  return images.map(imageUrl => `
    <div class="product-gallery-item" data-url="${imageUrl}">
      <img src="${imageUrl}" alt="Product Image">
      <button type="button" class="remove-image" title="Remove Image">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');
}

// Handle image upload
async function handleImageUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  // Show loading state
  const gallery = document.getElementById('productImageGallery');
  const addBtn = document.getElementById('addImageBtn');
  addBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px;"></div>';
  
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Generate a unique filename
      const timestamp = new Date().getTime();
      const fileName = `products/${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Add to uploaded images array
      uploadedImages.push(downloadURL);
      
      // Add to current product images
      if (!currentProductDetail.images) {
        currentProductDetail.images = [];
      }
      currentProductDetail.images.push(downloadURL);
    }
    
    // Re-render image gallery
    gallery.innerHTML = renderProductImages(currentProductDetail.images) + gallery.innerHTML;
    
    // Add event listeners for new image removal buttons
    document.querySelectorAll('.remove-image').forEach(button => {
      button.addEventListener('click', (e) => {
        const imageUrl = e.target.closest('.product-gallery-item').dataset.url;
        removeProductImage(imageUrl);
      });
    });
    
    // Reset file input
    event.target.value = '';
    
  } catch (error) {
    console.error('Error uploading images:', error);
    alert('Error uploading images. Please try again.');
  } finally {
    // Restore add button
    addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Image';
  }
}

// Remove product image
function removeProductImage(imageUrl) {
  // Add to deleted images array if it's not a newly uploaded image
  if (!uploadedImages.includes(imageUrl)) {
    deletedImages.push(imageUrl);
  } else {
    // Remove from uploaded images if it was just uploaded
    uploadedImages = uploadedImages.filter(url => url !== imageUrl);
  }
  
  // Remove from current product images
  currentProductDetail.images = currentProductDetail.images.filter(url => url !== imageUrl);
  
  // Remove from DOM
  const gallery = document.getElementById('productImageGallery');
  const imageItem = gallery.querySelector(`[data-url="${imageUrl}"]`);
  if (imageItem) {
    imageItem.remove();
  }
}

// Save product changes
async function saveProductChanges() {
  try {
    // Get form values
    const name = document.getElementById('productName').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value) || 0;
    const stock = parseInt(document.getElementById('productStock').value) || 0;
    const category = document.getElementById('productCategory').value;
    const featured = document.getElementById('productFeatured').checked;
    
    // Validate required fields
    if (!name) {
      alert('Product name is required');
      return;
    }
    
    if (price < 0) {
      alert('Price cannot be negative');
      return;
    }
    
    if (stock < 0) {
      alert('Stock cannot be negative');
      return;
    }
    
    // Prepare product data
    const productData = {
      name,
      description,
      price,
      stock,
      category,
      featured,
      images: currentProductDetail.images || [],
      updatedAt: serverTimestamp()
    };
    
    if (isNewProduct) {
      productData.createdAt = serverTimestamp();
    }
    
    // Save to Firestore
    let productRef;
    if (isNewProduct) {
      productRef = await addDoc(collection(db, "Products"), productData);
    } else {
      productRef = doc(db, "Products", currentProductDetail.id);
      await updateDoc(productRef, productData);
    }
    
    // Delete removed images from storage
    for (const imageUrl of deletedImages) {
      try {
        // Extract the file path from the URL
        const imagePath = decodeURIComponent(imageUrl.split('/o/')[1].split('?')[0]);
        const imageRef = ref(storage, imagePath);
        await deleteObject(imageRef);
      } catch (error) {
        console.error('Error deleting image:', error);
        // Continue with other images even if one fails
      }
    }
    
    // Reload products
    loadProducts();
    
    // Close modal
    productDetailModal.style.display = 'none';
    
    // Show success message
    alert(isNewProduct ? 'Product added successfully' : 'Product updated successfully');
    
  } catch (error) {
    console.error('Error saving product:', error);
    alert('Error saving product. Please try again.');
  }
}

// Helper functions
function formatPrice(price) {
  return parseFloat(price).toFixed(2);
}

function capitalizeFirstLetter(string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function showLoading() {
  productsTableContainer.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
    </div>
  `;
}

function showModalLoading() {
  productDetailContent.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
    </div>
  `;
}

function showEmptyState() {
  productsTableContainer.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-box-open"></i>
      <h3>No products found</h3>
      <p>There are no products matching your current filters.</p>
    </div>
  `;
}

function showErrorState() {
  productsTableContainer.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Error loading products</h3>
      <p>There was a problem loading the products. Please try again.</p>
    </div>
  `;
}

// Debounce function for search input
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

// Initialize sample data if needed (for testing)
async function initializeSampleData() {
  try {
    const productsRef = collection(db, "Products");
    const snapshot = await getDocs(productsRef);
    
    // Only add sample data if no products exist
    if (snapshot.empty) {
      console.log('No products found, adding sample data...');
      
      const sampleProducts = [
        {
          name: 'Gold Chain Necklace',
          description: 'Elegant gold chain necklace with a delicate pendant. Perfect for everyday wear or special occasions.',
          price: 89.99,
          stock: 15,
          category: 'necklaces',
          featured: true,
          images: [
            'https://firebasestorage.googleapis.com/v0/b/daisy-s-website.firebasestorage.app/o/products%2Fsample_necklace1.jpg?alt=media'
          ],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        {
          name: 'Silver Hoop Earrings',
          description: 'Classic silver hoop earrings that add a touch of elegance to any outfit.',
          price: 45.99,
          stock: 20,
          category: 'earrings',
          featured: false,
          images: [
            'https://firebasestorage.googleapis.com/v0/b/daisy-s-website.firebasestorage.app/o/products%2Fsample_earrings1.jpg?alt=media'
          ],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        {
          name: 'Pearl Bracelet',
          description: 'Beautiful pearl bracelet with sterling silver clasp. A timeless piece for your collection.',
          price: 65.50,
          stock: 8,
          category: 'bracelets',
          featured: true,
          images: [
            'https://firebasestorage.googleapis.com/v0/b/daisy-s-website.firebasestorage.app/o/products%2Fsample_bracelet1.jpg?alt=media'
          ],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        {
          name: 'Diamond Engagement Ring',
          description: 'Stunning diamond engagement ring set in 18k white gold. The perfect symbol of your love.',
          price: 1299.99,
          stock: 5,
          category: 'rings',
          featured: true,
          images: [
            'https://firebasestorage.googleapis.com/v0/b/daisy-s-website.firebasestorage.app/o/products%2Fsample_ring1.jpg?alt=media'
          ],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        {
          name: 'Gold Charm Bracelet',
          description: 'Gold charm bracelet with customizable charms. Add your personal touch to this beautiful piece.',
          price: 120.00,
          stock: 12,
          category: 'bracelets',
          featured: false,
          images: [
            'https://firebasestorage.googleapis.com/v0/b/daisy-s-website.firebasestorage.app/o/products%2Fsample_bracelet2.jpg?alt=media'
          ],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        {
          name: 'Crystal Drop Earrings',
          description: 'Elegant crystal drop earrings that catch the light beautifully. Perfect for special occasions.',
          price: 55.99,
          stock: 0,
          category: 'earrings',
          featured: false,
          images: [
            'https://firebasestorage.googleapis.com/v0/b/daisy-s-website.firebasestorage.app/o/products%2Fsample_earrings2.jpg?alt=media'
          ],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      ];
      
      // Add sample products to Firestore
      for (const product of sampleProducts) {
        await addDoc(collection(db, "Products"), product);
      }
      
      console.log('Sample products added successfully');
    }
  } catch (error) {
    console.error('Error initializing sample data:', error);
  }
}

// Call initializeSampleData on page load (comment out in production)
// initializeSampleData();
