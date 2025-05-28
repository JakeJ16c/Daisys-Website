// login-auth.js
import { auth } from './firebase.js';
import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

const form      = document.getElementById('loginForm');
const loginError = document.getElementById('login-error');

// keep the user signed in across refreshes
setPersistence(auth, browserLocalPersistence);

form.addEventListener('submit', async e => {
  e.preventDefault();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);

    if (user.email === 'daisybelle76@gmail.com') {
      // admin → dashboard
      window.location.href = 'admin.html';
    } else {
      // everyone else → home
      window.location.href = 'index.html';
    }
  } catch (err) {
    loginError.textContent   = '❌ ' + err.message.replace('Firebase: ', '');
    loginError.style.display = 'block';
  }
});
