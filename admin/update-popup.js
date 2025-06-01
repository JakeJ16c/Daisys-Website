// update-popup.js
const popup = document.createElement('div');
popup.id = 'update-popup';
popup.innerText = '🔄 Update Available — Tap to refresh';
popup.style = `
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #204ECF;
  color: white;
  padding: 12px 20px;
  border-radius: 30px;
  display: none;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 9999;
  cursor: pointer;
`;
document.body.appendChild(popup);

let newSW;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/Daisys-Website/firebase-messaging-sw.js') .then(reg => {
    reg.addEventListener('updatefound', () => {
      newSW = reg.installing;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          popup.style.display = 'block';
          popup.addEventListener('click', () => {
            newSW.postMessage({ action: 'skipWaiting' });
          });
        }
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}
