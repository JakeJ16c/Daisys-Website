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

  track.innerHTML = items.concat(items).join('');

  // ✅ Wait for all images to finish loading before starting animation
  const images = track.querySelectorAll('img');
  let loaded = 0;

  images.forEach(img => {
    if (img.complete) {
      loaded++;
    } else {
      img.onload = img.onerror = () => {
        loaded++;
        if (loaded === images.length) {
          startMarquee();
        }
      };
    }
  });

  // If all were already loaded (from cache)
  if (loaded === images.length) {
    startMarquee();
  }

  function startMarquee() {
    track.style.animation = 'none'; // Reset
    track.offsetHeight;             // Force reflow
    track.style.animation = '';     // Re-apply animation
  }
}

loadMarquee();
