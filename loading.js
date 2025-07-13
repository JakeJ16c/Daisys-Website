// Inject HTML
const loaderHTML = `
  <div id="loading-screen">
    <div class="loader-inner">
      <div class="spinner-wrapper">
        <div class="spinner"></div>
        <img src="favicon_circle.ico" class="logo-inside-spinner" />
      </div>
      <p class="loading-text">Loading...</p>  
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

  .loader-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .loading-text {
    margin-top: 20px;
    font-family: 'Nunito Sans', sans-serif;
    font-size: 2rem;
    font-weight: bold;
    color: #204ECF;
    text-align: center;
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
    transition: opacity 4s ease;
  }

  #loading-screen.fade-out {
    opacity: 0;
    pointer-events: none;
  }

  .spinner-wrapper {
    position: relative;
    width: 70px;
    height: 70px;
  }
  
  .spinner {
    width: 70px;
    height: 70px;
    border: 5px solid #ccc;
    border-top-color: #204ECF;
    border-radius: 50%;
    animation: spin 1.2s linear infinite;
  }
  
  .logo-inside-spinner {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-43%, -43%);
    width: 60px;
    height: 60px;
    border-radius: 50%;
    object-fit: contain;
    pointer-events: none;
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
      document.body.style.transition = "opacity 2s ease";
      document.body.style.opacity = "1";
    }, 0);

    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
  }, 3500);
});
