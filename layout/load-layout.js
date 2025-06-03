document.addEventListener("DOMContentLoaded", () => {
  const inject = async (id, file) => {
    const res = await fetch(file);
    const html = await res.text();
    document.getElementById(id).innerHTML = html;
  };

  // Inject announcement bar + fade logic
  const inject = async (id, file, callback) => {
  try {
    const res = await fetch(file);
    const html = await res.text();
    const container = document.getElementById(id);
    
    if (container) {
      container.innerHTML = html;
      
      // Execute callback after HTML is injected
      if (typeof callback === "function") {
        callback();
      }
    } else {
      console.error(`Container with ID "${id}" not found`);
    }
  } catch (error) {
    console.error(`Error loading ${file}:`, error);
  }
};
  
  // Inject footer
  inject("footer-container", "layout/footer.html");
});
