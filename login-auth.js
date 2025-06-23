// login-auth.js
import { auth, db } from './firebase.js';
import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

// ========== Login Handling ==========
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
            await sendEmailVerification(user);
            showToast('📩 Verification email re-sent!');
          } catch (error) {
            showToast('⚠️ Error resending email: ' + error.message);
          }
          document.removeEventListener('click', resendHandler);
        }
      });

      await signOut(auth);
      return;
    }

    // Ensure Firestore user doc exists
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

    window.location.href = 'account.html';

  } catch (err) {
    showToast('❌ ' + err.message.replace('Firebase: ', ''));
  }
});

// ========== Toast Message ==========
function showToast(message, duration = 4000) {
  const toast = document.getElementById("toast");
  toast.innerHTML = message;
  toast.classList.remove("hidden");
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hidden");
  }, duration);
}

// ========== Forgot Password Modal ==========
window.sendPasswordReset = async () => {
  const emailInput = document.getElementById('resetEmail');
  const email = emailInput.value.trim();
  const status = document.getElementById('resetStatus');

  if (!email) {
    status.style.color = 'red';
    status.innerHTML = "<i class='fa-solid fa-xmark'></i> Please enter an email address.";
    return;
  }

  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    if (methods.length === 0) {
      status.style.color = 'red';
      status.innerHTML = "<i class='fa-solid fa-xmark'></i> No account found with that email.";
    } else {
      await sendPasswordResetEmail(auth, email);
      status.style.color = 'green';
      status.innerHTML = "<i class='fa-solid fa-check'></i> Reset email sent!";
      setTimeout(closeForgotModal, 2000);
    }
  } catch (error) {
    status.style.color = 'red';
    status.innerHTML = "<i class='fa-solid fa-xmark'></i> " + error.message;
  }
};

window.closeForgotModal = () => {
  document.getElementById('forgotPasswordModal').style.display = 'none';
  document.getElementById('resetEmail').value = '';
  document.getElementById('resetStatus').textContent = '';
};

document.addEventListener('DOMContentLoaded', () => {
  // Close modal on background click
  window.onclick = function (event) {
    const modal = document.getElementById('forgotPasswordModal');
    if (event.target === modal) {
      closeForgotModal();
    }
  };

  // Clear error as user types
  const resetEmailInput = document.getElementById('resetEmail');
  if (resetEmailInput) {
    resetEmailInput.addEventListener('input', () => {
      const status = document.getElementById('resetStatus');
      if (status && status.textContent !== "") {
        status.textContent = "";
      }
    });
  }
});
