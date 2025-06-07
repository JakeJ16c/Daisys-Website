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
        showToast(`
          ❌ Please verify your email.
          <br><button id="resend-verification" style="margin-top: 0.5rem; background: white; color: black; border: none; padding: 0.3rem 0.8rem; border-radius: 5px; cursor: pointer;">
            Resend Verification Email
          </button>
        `, 8000);
      
        document.addEventListener('click', async function resendHandler(e) {
          if (e.target && e.target.id === 'resend-verification') {
            try {
              await user.sendEmailVerification();
              showToast('📩 Verification email re-sent!');
            } catch (error) {
              showToast('⚠️ Error resending email: ' + error.message);
            }
            document.removeEventListener('click', resendHandler); // prevent duplicates
          }
        });
      
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
    showToast('❌ ' + err.message.replace('Firebase: ', ''));
  }
});

// Toast helper
function showToast(message, duration = 4000) {
  const toast = document.getElementById("toast");
  toast.innerHTML = message; // allow HTML, not just text
  toast.classList.remove("hidden");
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hidden");
  }, duration);
}
