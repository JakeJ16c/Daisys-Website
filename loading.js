// Inject HTML
const loaderHTML = `
  <div id="loading-screen">
    <div class="spinner"></div>
  </div>
  <div id="main-content" class="hidden">
    <!-- Page content remains visible underneath -->
  </div>
`;
document.body.insertAdjacentHTML("afterbegin", loaderHTML);

// Inject CSS
const style = document.createElement("style");
style.textContent = `
  #loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background: #f8f3ea;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    transition: opacity 0.4s ease;
  }

  #loading-screen.fade-out {
    opacity: 0;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 5px solid #ccc;
    border-top-color: #ee77a6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .hidden {
    display: none;
  }
`;
document.head.appendChild(style);

// Handle hide logic
window.addEventListener("load", () => {
  const loadingScreen = document.getElementById("loading-screen");
  const mainContent = document.getElementById("main-content");

  loadingScreen.classList.add("fade-out");

  setTimeout(() => {
    loadingScreen.remove(); // Cleanly remove loader
    mainContent.classList.remove("hidden");
  }, 400);
});