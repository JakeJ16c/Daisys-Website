import { db } from './firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

async function loadMarquee() {
  const track = document.querySelector('.marquee-track');
  if (!track) return;

  const snap = await getDocs(collection(db, 'marqueeImages'));
  const items = [];

  snap.forEach(docSnap => {
    const d = docSnap.data();
    items.push(`
      <div class="circle-card">
        <div class="circle-image">
          <img src="${d.imageUrl}" alt="${d.name}" />
        </div>
        <p>${d.name}</p>
      </div>
    `);
  });

  track.innerHTML = items.join('');

  // ✅ Force animation restart for Safari fix
  setTimeout(() => {
    track.style.animation = 'none';
    track.offsetHeight; // Force reflow
    track.style.animation = ''; // Restart animation
  }, 100);
}

loadMarquee();
