// admin-auth.js
import { auth } from '../firebase.js';
import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

// Elements
const loginOverlay = document.getElementById('adminLoginOverlay');
const loginForm = document.getElementById('adminLoginForm');
const loginError = document.getElementById('login-error');
const adminContent = document.querySelector('.admin-panel-wrapper');

// Keep the user signed in across refreshes
setPersistence(auth, browserLocalPersistence);

// Check if user is already logged in
onAuthStateChanged(auth, (user) => {
  if (user && user.email === 'daisybelle76@gmail.com') {
    // Admin is logged in, hide login overlay and show admin content
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (adminContent) adminContent.style.display = 'flex';
  } else {
    // Not logged in or not admin, show login overlay and hide admin content
    if (loginOverlay) loginOverlay.style.display = 'flex';
    if (adminContent) adminContent.style.display = 'none';
    
    // If on index.html and not admin, redirect to login page
    const currentPath = window.location.pathname;
    if (currentPath.endsWith('index.html') && !loginOverlay) {
      window.location.href = './login.html';
    }
  }
});

// Handle login form submission
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    // Disable button during login attempt
    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      
      if (user.email === 'daisybelle76@gmail.com') {
        // Admin login successful
        loginError.style.display = 'none';
        
        // Redirect to admin index if on login page
        if (window.location.pathname.endsWith('login.html')) {
          window.location.href = 'index.html';
        } else {
          // Already on admin page, just hide overlay and show content
          loginOverlay.style.display = 'none';
          if (adminContent) adminContent.style.display = 'flex';
        }
      } else {
        // Not admin
        auth.signOut();
        loginError.textContent = '❌ Access denied. Admin privileges required.';
        loginError.style.display = 'block';
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Secure Login';
      }
    } catch (err) {
      // Login failed
      loginError.textContent = '❌ ' + err.message.replace('Firebase: ', '');
      loginError.style.display = 'block';
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Secure Login';
    }
  });
}

// Add logout functionality
const addLogoutButton = () => {
  // Check if logout button already exists
  if (document.getElementById('admin-logout')) return;
  
  // Create logout button
  const logoutButton = document.createElement('button');
  logoutButton.id = 'admin-logout';
  logoutButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
  logoutButton.className = 'admin-logout-btn';
  
  // Add styles to the button
  logoutButton.style.position = 'fixed';
  logoutButton.style.top = '10px';
  logoutButton.style.right = '10px';
  logoutButton.style.padding = '8px 12px';
  logoutButton.style.backgroundColor = 'var(--electric-blue)';
  logoutButton.style.color = 'white';
  logoutButton.style.border = 'none';
  logoutButton.style.borderRadius = '6px';
  logoutButton.style.cursor = 'pointer';
  logoutButton.style.zIndex = '999';
  
  // Add hover effect
  logoutButton.addEventListener('mouseover', () => {
    logoutButton.style.backgroundColor = '#183aa0';
  });
  
  logoutButton.addEventListener('mouseout', () => {
    logoutButton.style.backgroundColor = 'var(--electric-blue)';
  });
  
  // Add logout functionality
  logoutButton.addEventListener('click', () => {
    auth.signOut().then(() => {
      // Redirect to login page after logout
      window.location.href = 'login.html';
    });
  });
  
  // Add to document
  document.body.appendChild(logoutButton);
};

// Add logout button when admin is logged in
onAuthStateChanged(auth, (user) => {
  if (user && user.email === 'daisybelle76@gmail.com') {
    addLogoutButton();
  }
});
