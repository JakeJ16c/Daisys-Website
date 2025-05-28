import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// Form and fields
const form = document.getElementById("profileForm");
const logoutBtn = document.getElementById("logoutBtn");

const firstNameInput = document.getElementById("first-name");
const lastNameInput = document.getElementById("last-name");
const houseNumberInput = document.getElementById("house-number");
const streetInput = document.getElementById("street");
const cityInput = document.getElementById("city");
const countyInput = document.getElementById("county");
const postcodeInput = document.getElementById("postcode");

let userDocRef = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    return window.location.replace("login.html");
  }

  userDocRef = doc(db, "users", user.uid);

  // Load existing data
  const snap = await getDoc(userDocRef);
  if (snap.exists()) {
    const data = snap.data();
    if (data.firstName) firstNameInput.value = data.firstName;
    if (data.lastName) lastNameInput.value = data.lastName;
    if (data.address) {
      houseNumberInput.value = data.address.houseNumber || "";
      streetInput.value = data.address.street || "";
      cityInput.value = data.address.city || "";
      countyInput.value = data.address.county || "";
      postcodeInput.value = data.address.postcode || "";
    }
  }
});

// Save updated profile
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    firstName: firstNameInput.value,
    lastName: lastNameInput.value,
    address: {
      houseNumber: houseNumberInput.value,
      street: streetInput.value,
      city: cityInput.value,
      county: countyInput.value,
      postcode: postcodeInput.value
    },
    updatedAt: serverTimestamp()
  };

  await setDoc(userDocRef, data, { merge: true });
  alert("Profile updated!");
  // Page refresh
  window.location.reload();
});

// Log out
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});
