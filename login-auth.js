import { auth, db } from './firebase.js';
import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

// ======================
// 🔐 Apple Login Logic
// ======================
const appleBtn = document.querySelector('#appleBtn');
if (appleBtn) {
  appleBtn.addEventListener('click', async () => {
    try {
      const provider = new OAuthProvider('apple.com');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || '',
          createdAt: new Date(),
          provider: 'apple',
        });
        console.log('🆕 New Apple user added to Firestore');
      } else {
        console.log('✅ Apple user already exists');
      }

      window.location.href = 'account.html';
    } catch (err) {
      console.error('❌ Apple sign-in failed:', err);
      showToast('Apple login failed. Please try again.');
    }
  });
}

// ======================
// 🔐 Google Login Logic
// ======================
const googleBtn = document.querySelector(".google-login");
if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Create new user document
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName || "",
          email: user.email || "",
          createdAt: new Date(),
          photoURL: user.photoURL || "",
          role: "customer"
        });
        console.log("✅ New user created in Firestore");
      } else {
        console.log("👤 Existing user logged in");
      }

      // Redirect
      window.location.href = "index.html";

    } catch (error) {
      console.error("❌ Google sign-in error:", error);
      alert("Google sign-in failed. Please try again.");
    }
  });
}

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
      console.log("Looking up methods for:", email); // 👈 DEBUG
      const methods = await fetchSignInMethodsForEmail(auth, email);
      console.log("Methods returned:", methods);      // 👈 DEBUG
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
