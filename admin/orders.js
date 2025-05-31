// orders.js - Order Management functionality for admin dashboard
import { auth, db } from '../firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  endBefore,
  limitToLast,
  Timestamp 
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

// DOM Elements
const ordersTableContainer = document.getElementById('ordersTableContainer');
const orderSearch = document.getElementById('orderSearch');
const statusFilter = document.getElementById('statusFilter');
const sortOrder = document.getElementById('sortOrder');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const orderDetailModal = document.getElementById('orderDetailModal');
const orderDetailContent = document.getElementById('orderDetailContent');
const saveChangesBtn = document.getElementById('saveChangesBtn');
const printOrderBtn = document.getElementById('printOrderBtn');
const logoutBtn = document.getElementById('logoutBtn');

// State variables
let currentOrders = [];
let lastVisible = null;
let firstVisible = null;
let currentPage = 1;
let currentOrdersPerPage = 10;
let currentFilter = 'all';
let currentSort = 'newest';
let currentSearchTerm = '';
let currentOrderDetail = null;

// Auth check
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = 'login.html';
  } else {
    loadOrders();
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
if (orderSearch) {
  orderSearch.addEventListener('input', debounce(() => {
    currentSearchTerm = orderSearch.value.trim().toLowerCase();
    currentPage = 1;
    loadOrders();
  }, 300));
}

if (statusFilter) {
  statusFilter.addEventListener('change', () => {
    currentFilter = statusFilter.value;
    currentPage = 1;
    loadOrders();
  });
}

if (sortOrder) {
  sortOrder.addEventListener('change', () => {
    currentSort = sortOrder.value;
    currentPage = 1;
    loadOrders();
  });
}

if (prevPageBtn) {
  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadOrders(true, 'prev');
    }
  });
}

if (nextPageBtn) {
  nextPageBtn.addEventListener('click', () => {
    currentPage++;
    loadOrders(true, 'next');
  });
}

if (saveChangesBtn) {
  saveChangesBtn.addEventListener('click', saveOrderChanges);
}

if (printOrderBtn) {
  printOrderBtn.addEventListener('click', printOrder);
}

// Load orders from Firestore
async function loadOrders(paginate = false, direction = 'next') {
  showLoading();
  
  try {
    let ordersRef = collection(db, "Orders");
    let ordersQuery;
    
    // Apply sorting
    let orderByField, orderByDirection;
    switch (currentSort) {
      case 'newest':
        orderByField = 'orderDate';
        orderByDirection = 'desc';
        break;
      case 'oldest':
        orderByField = 'orderDate';
        orderByDirection = 'asc';
        break;
      case 'highest':
        orderByField = 'total';
        orderByDirection = 'desc';
        break;
      case 'lowest':
        orderByField = 'total';
        orderByDirection = 'asc';
        break;
      default:
        orderByField = 'orderDate';
        orderByDirection = 'desc';
    }
    
    // Build query
    if (currentFilter !== 'all') {
      ordersQuery = query(
        ordersRef, 
        where('status', '==', currentFilter),
        orderBy(orderByField, orderByDirection)
      );
    } else {
      ordersQuery = query(
        ordersRef, 
        orderBy(orderByField, orderByDirection)
      );
    }
    
    // Apply pagination
    if (paginate) {
      if (direction === 'next' && lastVisible) {
        ordersQuery = query(
          ordersQuery,
          startAfter(lastVisible),
          limit(currentOrdersPerPage)
        );
      } else if (direction === 'prev' && firstVisible) {
        ordersQuery = query(
          ordersQuery,
          endBefore(firstVisible),
          limitToLast(currentOrdersPerPage)
        );
      } else {
        ordersQuery = query(
          ordersQuery,
          limit(currentOrdersPerPage)
        );
      }
    } else {
      ordersQuery = query(
        ordersQuery,
        limit(currentOrdersPerPage)
      );
    }
    
    const snapshot = await getDocs(ordersQuery);
    
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
    nextPageBtn.disabled = snapshot.docs.length < currentOrdersPerPage;
    
    // Process orders
    currentOrders = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to JS Date objects
        orderDate: data.orderDate instanceof Timestamp ? data.orderDate.toDate() : new Date(),
      };
    });
    
    // Apply search filter in memory (if needed)
    if (currentSearchTerm) {
      currentOrders = currentOrders.filter(order => 
        order.id.toLowerCase().includes(currentSearchTerm) ||
        (order.customer?.name && order.customer.name.toLowerCase().includes(currentSearchTerm)) ||
        (order.customer?.email && order.customer.email.toLowerCase().includes(currentSearchTerm))
      );
    }
    
    renderOrdersTable();
    
  } catch (error) {
    console.error('Error loading orders:', error);
    showErrorState();
  }
}

// Render orders table
function renderOrdersTable() {
  if (currentOrders.length === 0) {
    showEmptyState();
    return;
  }
  
  const tableHTML = `
    <table class="orders-table">
      <thead>
        <tr>
          <th>Order ID</th>
          <th>Date</th>
          <th>Customer</th>
          <th>Total</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${currentOrders.map(order => `
          <tr>
            <td class="order-id">${order.id}</td>
            <td class="order-date">${formatDate(order.orderDate)}</td>
            <td class="order-customer">${order.customer?.name || 'Guest'}</td>
            <td class="order-total">£${formatPrice(order.total || 0)}</td>
            <td>
              <span class="order-status status-${order.status || 'pending'}">${capitalizeFirstLetter(order.status || 'pending')}</span>
            </td>
            <td>
              <button class="action-btn view-order" data-id="${order.id}" title="View Order">
                <i class="fas fa-eye"></i>
              </button>
              <button class="action-btn print-order" data-id="${order.id}" title="Print Order">
                <i class="fas fa-print"></i>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  ordersTableContainer.innerHTML = tableHTML;
  
  // Add event listeners to action buttons
  document.querySelectorAll('.view-order').forEach(button => {
    button.addEventListener('click', () => viewOrderDetails(button.dataset.id));
  });
  
  document.querySelectorAll('.print-order').forEach(button => {
    button.addEventListener('click', () => printOrderById(button.dataset.id));
  });
}

// View order details
async function viewOrderDetails(orderId) {
  try {
    showModalLoading();
    orderDetailModal.style.display = 'block';
    
    const orderRef = doc(db, "Orders", orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (!orderSnap.exists()) {
      orderDetailContent.innerHTML = '<div class="empty-state"><h3>Order not found</h3></div>';
      return;
    }
    
    const orderData = orderSnap.data();
    currentOrderDetail = {
      id: orderId,
      ...orderData,
      orderDate: orderData.orderDate instanceof Timestamp ? orderData.orderDate.toDate() : new Date(),
    };
    
    renderOrderDetails(currentOrderDetail);
    
  } catch (error) {
    console.error('Error loading order details:', error);
    orderDetailContent.innerHTML = '<div class="empty-state"><h3>Error loading order details</h3></div>';
  }
}

// Render order details in modal
function renderOrderDetails(order) {
  const orderItems = order.items || [];
  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = order.shipping || 0;
  const tax = order.tax || 0;
  const total = order.total || subtotal + shipping + tax;
  
  const detailsHTML = `
    <div class="order-detail-section">
      <h4>Order Information</h4>
      <div class="order-info-grid">
        <div class="order-info-item">
          <div class="order-info-label">Order ID</div>
          <div class="order-info-value">${order.id}</div>
        </div>
        <div class="order-info-item">
          <div class="order-info-label">Order Date</div>
          <div class="order-info-value">${formatDate(order.orderDate)}</div>
        </div>
        <div class="order-info-item">
          <div class="order-info-label">Status</div>
          <div class="order-info-value">
            <select id="orderStatusSelect" class="order-status-select">
              <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
              <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
              <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </div>
        </div>
        <div class="order-info-item">
          <div class="order-info-label">Payment Method</div>
          <div class="order-info-value">${order.paymentMethod || 'Not specified'}</div>
        </div>
      </div>
    </div>
    
    <div class="order-detail-section">
      <h4>Customer Information</h4>
      <div class="order-info-grid">
        <div class="order-info-item">
          <div class="order-info-label">Name</div>
          <div class="order-info-value">${order.customer?.name || 'Guest'}</div>
        </div>
        <div class="order-info-item">
          <div class="order-info-label">Email</div>
          <div class="order-info-value">${order.customer?.email || 'Not provided'}</div>
        </div>
        <div class="order-info-item">
          <div class="order-info-label">Phone</div>
          <div class="order-info-value">${order.customer?.phone || 'Not provided'}</div>
        </div>
      </div>
    </div>
    
    <div class="order-detail-section">
      <h4>Shipping Address</h4>
      <div class="order-info-grid">
        <div class="order-info-item">
          <div class="order-info-value">
            ${order.shippingAddress?.line1 || ''}<br>
            ${order.shippingAddress?.line2 ? order.shippingAddress.line2 + '<br>' : ''}
            ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} ${order.shippingAddress?.postalCode || ''}<br>
            ${order.shippingAddress?.country || ''}
          </div>
        </div>
      </div>
    </div>
    
    <div class="order-detail-section">
      <h4>Order Items</h4>
      <table class="order-items-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Quantity</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${orderItems.map(item => `
            <tr>
              <td>${item.name || 'Unknown Product'}</td>
              <td>£${formatPrice(item.price || 0)}</td>
              <td>${item.quantity || 1}</td>
              <td>£${formatPrice((item.price || 0) * (item.quantity || 1))}</td>
            </tr>
          `).join('')}
          <tr>
            <td colspan="3" style="text-align: right;"><strong>Subtotal:</strong></td>
            <td>£${formatPrice(subtotal)}</td>
          </tr>
          <tr>
            <td colspan="3" style="text-align: right;"><strong>Shipping:</strong></td>
            <td>£${formatPrice(shipping)}</td>
          </tr>
          <tr>
            <td colspan="3" style="text-align: right;"><strong>Tax:</strong></td>
            <td>£${formatPrice(tax)}</td>
          </tr>
          <tr class="order-total-row">
            <td colspan="3" style="text-align: right;"><strong>Total:</strong></td>
            <td>£${formatPrice(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    ${order.notes ? `
      <div class="order-detail-section">
        <h4>Notes</h4>
        <div class="order-info-value">${order.notes}</div>
      </div>
    ` : ''}
  `;
  
  orderDetailContent.innerHTML = detailsHTML;
}

// Save order changes
async function saveOrderChanges() {
  if (!currentOrderDetail) return;
  
  const statusSelect = document.getElementById('orderStatusSelect');
  if (!statusSelect) return;
  
  const newStatus = statusSelect.value;
  
  try {
    const orderRef = doc(db, "Orders", currentOrderDetail.id);
    await updateDoc(orderRef, {
      status: newStatus,
      lastUpdated: new Date()
    });
    
    // Update local data
    currentOrderDetail.status = newStatus;
    
    // Update the order in the current orders list
    const orderIndex = currentOrders.findIndex(order => order.id === currentOrderDetail.id);
    if (orderIndex !== -1) {
      currentOrders[orderIndex].status = newStatus;
      renderOrdersTable();
    }
    
    // Show success message
    alert('Order status updated successfully');
    
  } catch (error) {
    console.error('Error updating order:', error);
    alert('Error updating order status');
  }
}

// Print order
function printOrder() {
  if (!currentOrderDetail) return;
  printOrderById(currentOrderDetail.id);
}

// Print order by ID
function printOrderById(orderId) {
  const order = currentOrders.find(o => o.id === orderId) || currentOrderDetail;
  if (!order) return;
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  // Generate print content
  const orderItems = order.items || [];
  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = order.shipping || 0;
  const tax = order.tax || 0;
  const total = order.total || subtotal + shipping + tax;
  
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Order #${order.id}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          color: #204ECF;
        }
        .section {
          margin-bottom: 20px;
        }
        .section h2 {
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .info-item {
          margin-bottom: 10px;
        }
        .info-label {
          font-weight: bold;
          margin-bottom: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #f8f8f8;
        }
        .total-row {
          font-weight: bold;
        }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 0.9em;
          color: #777;
        }
        @media print {
          body {
            padding: 0;
          }
          button {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>You're So Golden</h1>
        <p>Order #${order.id}</p>
      </div>
      
      <div class="section">
        <h2>Order Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Order Date</div>
            <div>${formatDate(order.orderDate)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Status</div>
            <div>${capitalizeFirstLetter(order.status || 'pending')}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Payment Method</div>
            <div>${order.paymentMethod || 'Not specified'}</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2>Customer Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Name</div>
            <div>${order.customer?.name || 'Guest'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Email</div>
            <div>${order.customer?.email || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Phone</div>
            <div>${order.customer?.phone || 'Not provided'}</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2>Shipping Address</h2>
        <p>
          ${order.shippingAddress?.line1 || ''}<br>
          ${order.shippingAddress?.line2 ? order.shippingAddress.line2 + '<br>' : ''}
          ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} ${order.shippingAddress?.postalCode || ''}<br>
          ${order.shippingAddress?.country || ''}
        </p>
      </div>
      
      <div class="section">
        <h2>Order Items</h2>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${orderItems.map(item => `
              <tr>
                <td>${item.name || 'Unknown Product'}</td>
                <td>£${formatPrice(item.price || 0)}</td>
                <td>${item.quantity || 1}</td>
                <td>£${formatPrice((item.price || 0) * (item.quantity || 1))}</td>
              </tr>
            `).join('')}
            <tr>
              <td colspan="3" style="text-align: right;"><strong>Subtotal:</strong></td>
              <td>£${formatPrice(subtotal)}</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align: right;"><strong>Shipping:</strong></td>
              <td>£${formatPrice(shipping)}</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align: right;"><strong>Tax:</strong></td>
              <td>£${formatPrice(tax)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="3" style="text-align: right;"><strong>Total:</strong></td>
              <td>£${formatPrice(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      ${order.notes ? `
        <div class="section">
          <h2>Notes</h2>
          <p>${order.notes}</p>
        </div>
      ` : ''}
      
      <div class="footer">
        <p>Thank you for your order!</p>
        <p>You're So Golden - www.youresogolden.com</p>
      </div>
      
      <button onclick="window.print();" style="margin-top: 20px; padding: 10px 20px;">Print Order</button>
    </body>
    </html>
  `;
  
  printWindow.document.open();
  printWindow.document.write(printContent);
  printWindow.document.close();
  
  // Trigger print when content is loaded
  printWindow.onload = function() {
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}

// Helper functions
function formatDate(date) {
  if (!date) return 'N/A';
  
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Date(date).toLocaleDateString('en-GB', options);
}

function formatPrice(price) {
  return parseFloat(price).toFixed(2);
}

function capitalizeFirstLetter(string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function showLoading() {
  ordersTableContainer.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
    </div>
  `;
}

function showModalLoading() {
  orderDetailContent.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
    </div>
  `;
}

function showEmptyState() {
  ordersTableContainer.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-box-open"></i>
      <h3>No orders found</h3>
      <p>There are no orders matching your current filters.</p>
    </div>
  `;
}

function showErrorState() {
  ordersTableContainer.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Error loading orders</h3>
      <p>There was a problem loading the orders. Please try again.</p>
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
    const ordersRef = collection(db, "Orders");
    const snapshot = await getDocs(ordersRef);
    
    // Only add sample data if no orders exist
    if (snapshot.empty) {
      console.log('No orders found, adding sample data...');
      
      const sampleOrders = [
        {
          id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
          orderDate: new Date(),
          status: 'pending',
          customer: {
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            phone: '07700 900123'
          },
          shippingAddress: {
            line1: '123 High Street',
            city: 'London',
            postalCode: 'SW1A 1AA',
            country: 'United Kingdom'
          },
          items: [
            {
              name: 'Gold Necklace',
              price: 89.99,
              quantity: 1
            },
            {
              name: 'Silver Bracelet',
              price: 49.99,
              quantity: 2
            }
          ],
          shipping: 4.99,
          tax: 28.00,
          total: 222.97,
          paymentMethod: 'Credit Card'
        },
        {
          id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
          orderDate: new Date(Date.now() - 86400000), // Yesterday
          status: 'processing',
          customer: {
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '07700 900456'
          },
          shippingAddress: {
            line1: '456 Main Road',
            line2: 'Flat 3',
            city: 'Manchester',
            postalCode: 'M1 1AA',
            country: 'United Kingdom'
          },
          items: [
            {
              name: 'Diamond Earrings',
              price: 129.99,
              quantity: 1
            }
          ],
          shipping: 4.99,
          tax: 26.00,
          total: 160.98,
          paymentMethod: 'PayPal'
        },
        {
          id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
          orderDate: new Date(Date.now() - 172800000), // 2 days ago
          status: 'shipped',
          customer: {
            name: 'Emma Wilson',
            email: 'emma.wilson@example.com',
            phone: '07700 900789'
          },
          shippingAddress: {
            line1: '789 Park Avenue',
            city: 'Birmingham',
            postalCode: 'B1 1AA',
            country: 'United Kingdom'
          },
          items: [
            {
              name: 'Gold Hoop Earrings',
              price: 59.99,
              quantity: 1
            },
            {
              name: 'Pearl Necklace',
              price: 79.99,
              quantity: 1
            },
            {
              name: 'Charm Bracelet',
              price: 39.99,
              quantity: 1
            }
          ],
          shipping: 0, // Free shipping
          tax: 36.00,
          total: 215.97,
          paymentMethod: 'Credit Card',
          notes: 'Please gift wrap items separately'
        },
        {
          id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
          orderDate: new Date(Date.now() - 604800000), // 1 week ago
          status: 'delivered',
          customer: {
            name: 'Michael Brown',
            email: 'michael.brown@example.com',
            phone: '07700 900234'
          },
          shippingAddress: {
            line1: '101 Queen Street',
            city: 'Edinburgh',
            postalCode: 'EH1 1AA',
            country: 'United Kingdom'
          },
          items: [
            {
              name: 'Silver Ring',
              price: 45.99,
              quantity: 1
            }
          ],
          shipping: 3.99,
          tax: 10.00,
          total: 59.98,
          paymentMethod: 'Debit Card'
        },
        {
          id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
          orderDate: new Date(Date.now() - 1209600000), // 2 weeks ago
          status: 'cancelled',
          customer: {
            name: 'Sarah Johnson',
            email: 'sarah.johnson@example.com',
            phone: '07700 900567'
          },
          shippingAddress: {
            line1: '202 Castle Road',
            city: 'Cardiff',
            postalCode: 'CF10 1AA',
            country: 'United Kingdom'
          },
          items: [
            {
              name: 'Gold Plated Watch',
              price: 149.99,
              quantity: 1
            }
          ],
          shipping: 4.99,
          tax: 31.00,
          total: 185.98,
          paymentMethod: 'Credit Card',
          notes: 'Order cancelled due to item out of stock'
        }
      ];
      
      // Add sample orders to Firestore
      for (const order of sampleOrders) {
        const orderRef = doc(collection(db, "Orders"));
        await setDoc(orderRef, {
          ...order,
          id: orderRef.id // Use Firestore generated ID
        });
      }
      
      console.log('Sample orders added successfully');
    }
  } catch (error) {
    console.error('Error initializing sample data:', error);
  }
}

// Call initializeSampleData on page load (comment out in production)
// initializeSampleData();
