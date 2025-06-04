// Import Firebase setup and needed functions
import { auth, db } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';

import {
  doc,
  setDoc
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

// Reference to the form element
const form = document.getElementById('register-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault(); // prevent default page reload

  // Get form field values
  const firstName = document.getElementById('first-name').value.trim();
  const lastName = document.getElementById('last-name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  // Check if passwords match
  if (password !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  try {
    // Create new user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update the display name shown in Firebase Auth
    await updateProfile(user, {
      displayName: `${firstName} ${lastName}`
    });

    // Store additional user info in Firestore under 'users/{uid}'
    await setDoc(doc(db, "users", user.uid), {
      firstName,
      lastName,
      email,
      createdAt: new Date()
    });

    // Redirect to account page after successful registration
    window.location.href = "account.html";

    function showToast(message, duration = 4000) {
      const toast = document.getElementById("toast");
      toast.textContent = message;
      toast.classList.remove("hidden");
      toast.classList.add("show");
    
      setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hidden");
      }, duration);
    }

    if (error.code === "auth/email-already-in-use") {
      showToast("This email is already registered. Try logging in.");
    } else {
      showToast("Error: " + error.message);
    }

});
