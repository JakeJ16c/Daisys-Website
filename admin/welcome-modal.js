// Inject welcome modal CSS
const style = document.createElement('style');
style.textContent = `
/* === Welcome Modal Styles === */
.welcome-modal-preview-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 2rem;
}

.welcome-modal-preview {
  position: relative;
  width: 90%;
  max-width: 400px;
  padding: 2rem;
  border-radius: 12px;
  background-color: #fff3cd;
  opacity: 0.6;
  transition: transform 0.3s ease, opacity 0.3s ease;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05);
  text-align: center;
  cursor: pointer;
}

.welcome-modal-preview:hover {
  opacity: 1;
  transform: scale(1.03);
}

.welcome-modal-preview .edit-icon {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: white;
  padding: 6px 8px;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.welcome-modal-preview:hover .edit-icon {
  opacity: 1;
}

.modal-grid {
  display: flex;
  width: 100%;
}

.modal-image-preview {
  width: 50%;
  background: #f9f9f9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-image-preview img {
  max-width: 100%;
  height: auto;
}

.modal-text {
  width: 50%;
  padding: 1rem;
  text-align: left;
}

.modal-text h2, .modal-text p, .modal-text button {
  margin: 0.5rem 0;
}

.modal-cta {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  background-color: #204ECF;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.welcome-modal-full {
  position: fixed;
  display: none;
  top: 0;
  left: 0;
  z-index: 10000;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.4);
  justify-content: center;
  align-items: center;
}

.welcome-modal-full.show {
  display: flex;
}

.welcome-modal-content {
  background: white;
  border-radius: 12px;
  max-width: 700px;
  width: 95%;
  display: flex;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.close-modal {
  position: absolute;
  top: 0.75rem;
  right: 1rem;
  font-size: 2rem;
  font-weight: bold;
  color: #333;
  cursor: pointer;
}
`;
document.head.appendChild(style);

// Handle edit icon click
document.querySelector('.welcome-modal-preview .edit-icon')?.addEventListener('click', () => {
  document.getElementById('welcomeModalFull').classList.add('show');
  document.getElementById('welcomeModalFull').classList.remove('hidden');
});

// Handle close modal
window.closeFullModal = function () {
  document.getElementById('welcomeModalFull').classList.remove('show');
  document.getElementById('welcomeModalFull').classList.add('hidden');
};

// Inline editing
function makeTextEditable(selector, previewSelector, modalSelector) {
  const el = document.querySelector(selector);
  if (!el) return;

  el.setAttribute('contenteditable', true);
  el.addEventListener('input', () => {
    const val = el.textContent;
    document.querySelector(previewSelector).textContent = val;
    document.querySelector(modalSelector).textContent = val;
  });
}

makeTextEditable('#modalTitle', '#preview-headline', '#modalTitle');
makeTextEditable('#modalSubtitle', '#preview-message', '#modalSubtitle');
makeTextEditable('#modalCTA', '#preview-cta', '#modalCTA');

// Image upload and preview
const imageInput = document.getElementById('bgImageInput');
if (imageInput) {
  imageInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        document.getElementById('modalPreviewImage').src = result;
        document.getElementById('previewImage').src = result;
      };
      reader.readAsDataURL(file);
    }
  });
}

// Optional: Hook up a Save button to write changes to Firestore
// (will add this step-by-step once your inline setup is complete)
