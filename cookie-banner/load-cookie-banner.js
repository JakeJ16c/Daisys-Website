fetch('./cookie-banner/cookie-banner.html')
  .then(res => res.text())
  .then(html => {
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    // ✅ Execute any <script> tags inside the HTML
    container.querySelectorAll("script").forEach(oldScript => {
      const newScript = document.createElement("script");

      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }

      document.body.appendChild(newScript);
    });
  })
  .catch(err => console.error('❌ Failed to load cookie banner:', err));
