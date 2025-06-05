// login-auth.js
import { auth, db } from './firebase.js';
import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

const form = document.getElementById('loginForm');
const loginError = document.getElementById('login-error');

// Keep the user signed in across refreshes
setPersistence(auth, browserLocalPersistence);

form.addEventListener('submit', async e => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);

    if (!user.emailVerified) {
      loginError.textContent = '❌ Please verify your email before logging in.';
      loginError.style.display = 'block';
      await signOut(auth);
      return;
    }

    // ✅ Ensure Firestore user doc exists
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      const nameParts = user.displayName ? user.displayName.split(' ') : ['', ''];
      const [firstName, lastName] = nameParts;

      await setDoc(docRef, {
        firstName,
        lastName,
        email: user.email,
        createdAt: new Date()
      });
    }

    // ✅ Redirect all customers to Their Account Page
    window.location.href = 'account.html';

  } catch (err) {
    loginError.textContent = '❌ ' + err.message.replace('Firebase: ', '');
    loginError.style.display = 'block';
  }
});
