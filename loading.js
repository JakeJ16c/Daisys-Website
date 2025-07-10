// Inject HTML
const loaderHTML = `
  <div id="loading-screen">
    <div class="spinner"></div>
  </div>
`;
document.body.insertAdjacentHTML("afterbegin", loaderHTML);

// Inject CSS
const style = document.createElement("style");
style.textContent = `
  html, body {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  #loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
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
    pointer-events: none;
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
`;
document.head.appendChild(style);

// Show loader immediately
document.documentElement.style.overflow = "hidden"; // disable scroll

// Handle logic
window.addEventListener("load", () => {
  const loader = document.getElementById("loading-screen");
  loader.classList.add("fade-out");

  setTimeout(() => {
    loader.remove();
    document.documentElement.style.overflow = ""; // re-enable scroll
  }, 400);
});
