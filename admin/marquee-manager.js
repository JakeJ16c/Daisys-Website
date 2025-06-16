import { db, storage } from '../firebase.js';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js';

const container = document.getElementById('marquee-editor');

async function loadMarqueeImages() {
  container.innerHTML = '';
  const snap = await getDocs(collection(db, 'marqueeImages'));
  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement('div');
    div.classList.add('marquee-item');
    div.innerHTML = `
    <div class="marquee-image-wrapper">
      <img src="${data.imageUrl}" alt="${data.name}">
      <div class="edit-overlay">
        <i class="fas fa-pen"></i>
        <input class="edit-input" type="file" accept="image/*" data-id="${docSnap.id}">
      </div>
    </div>
    <div class="marquee-meta">
      <input type="text" value="${data.name}" data-id="${docSnap.id}">
      <button class="delete-btn" data-id="${docSnap.id}" title="Delete">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;
    container.appendChild(div);
  });

  const addDiv = document.createElement('div');
  addDiv.className = 'marquee-item';
  addDiv.innerHTML = `
    <div class="marquee-add-wrapper" id="add-marquee">
      <i class="fas fa-plus"></i>
    </div>
    <div style="height: 1rem;"></div>
  `;
  container.appendChild(addDiv);
}

async function addMarqueeItem() {
  await addDoc(collection(db, 'marqueeImages'), {
    name: 'New Item',
    imageUrl: '',
    createdAt: Date.now()
  });
  loadMarqueeImages();
}

container.addEventListener('change', async (e) => {
  if (e.target.classList.contains('edit-input')) {
    const id = e.target.dataset.id;
    const file = e.target.files[0];
    if (!file) return;
    const path = `marquee/${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    await updateDoc(doc(db, 'marqueeImages', id), { imageUrl: url });
    loadMarqueeImages();
  }

  if (e.target.matches('input[type="text"]')) {
    const id = e.target.dataset.id;
    await updateDoc(doc(db, 'marqueeImages', id), { name: e.target.value.trim() });
  }
});

container.addEventListener('click', (e) => {
  if (e.target.closest('#add-marquee')) {
    addMarqueeItem();
  }
});

loadMarqueeImages();

// Inject confirmation modal into body
const modal = document.createElement('div');
modal.id = 'confirm-modal';
modal.className = 'confirm-modal';
modal.innerHTML = `
  <div class="modal-content">
    <p>Are you sure you want to delete this image?</p>
    <div class="modal-actions">
      <button id="confirm-delete" class="confirm">Yes, Delete</button>
      <button id="cancel-delete" class="cancel">Cancel</button>
    </div>
  </div>
`;
document.body.appendChild(modal);

