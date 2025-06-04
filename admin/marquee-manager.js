import { db } from '../firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

const container = document.getElementById('marquee-editor');

async function loadMarqueeImages() {
  const querySnapshot = await getDocs(collection(db, "marqueeImages"));
  querySnapshot.forEach(doc => {
    const data = doc.data();
    const div = document.createElement('div');
    div.classList.add('marquee-item');
    div.innerHTML = `
      <div class="circle-wrapper">
        <img src="${data.imageUrl}" alt="${data.name}" />
        <input type="file" data-id="${doc.id}" class="file-upload" />
        <i class="fas fa-pen edit-icon" data-id="${doc.id}"></i>
      </div>
      <input type="text" value="${data.name}" class="image-name-input" data-id="${doc.id}" />
    `;
    container.appendChild(div);
  });
}

loadMarqueeImages();
