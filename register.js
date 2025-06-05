// Import Firebase setup and needed functions
import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

// Reference to the form element
const form = document.getElementById('register-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const firstName = document.getElementById('first-name').value.trim();
  const lastName = document.getElementById('last-name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (password !== confirmPassword) {
    showToast("Passwords do not match.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: `${firstName} ${lastName}`
    });

    // ✅ Send email verification
    await sendEmailVerification(user);

    showToast("Verification email sent! Please check your inbox.");
    
    // ✅ Redirect after short delay
    setTimeout(() => {
      window.location.href = "account.html";
    }, 2500);
    
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      showToast(`This email is already registered. Click <a href="login.html" style="color: var(--primary-color); text-decoration: underline;">here</a> to log in.`, 8000);
    } else {
      showToast("Error: " + error.message);
    }
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
