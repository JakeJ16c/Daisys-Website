<!-- firebase.js -->
<script type="module">
  // Import Firebase SDK modules from CDN
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
  import { getAuth } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

  // Your Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyA6kN9-7dN9Ovq6BmWBBJwBhLXRW6INX4c",
    authDomain: "daisy-s-website.firebaseapp.com",
    projectId: "daisy-s-website",
    storageBucket: "daisy-s-website.firebasestorage.app",
    messagingSenderId: "595443495060",
    appId: "1:595443495060:web:7bbdd1108ad336d55c8481",
    measurementId: "G-ST5CQ6PV41"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // Make Firebase available to other scripts globally
  window.firebaseApp = app;
  window.firebaseAuth = auth;
  window.firebaseDB = db;
</script>
