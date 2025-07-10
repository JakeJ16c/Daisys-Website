// Inject HTML
const loaderHTML = `
  <div id="loading-screen">
    <div class="spinner spinner-with-logo">
      <img src="IMG_8861.png" alt="Logo" class="logo-inside-spinner" />
    </div>
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

  .spinner-with-logo {
    position: relative;
    width: 70px;
    height: 70px;
    border: 5px solid #ccc;
    border-top-color: #204ECF;
    border-radius: 50%;
    animation: spin 3s linear infinite;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .logo-inside-spinner {
    position: absolute;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    object-fit: cover;
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
    
    document.body.style.opacity = "0";
    setTimeout(() => {
      document.body.style.transition = "opacity 0.3s ease";
      document.body.style.opacity = "1";
    }, 0);

    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
  }, 400);
});
