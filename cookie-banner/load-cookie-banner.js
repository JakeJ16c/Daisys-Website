fetch('./cookie-banner/cookie-banner.html')
  .then(res => res.text())
  .then(html => {
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    // ✅ Force any embedded <script> tags to execute
    container.querySelectorAll('script').forEach(script => {
      const newScript = document.createElement('script');

      if (script.src) {
        newScript.src = script.src;
      } else {
        newScript.textContent = script.textContent;
      }

      document.body.appendChild(newScript);
    });

    console.log('✅ Cookie banner HTML injected and scripts evaluated');
  })
  .catch(err => console.error('❌ Failed to load cookie banner:', err));
