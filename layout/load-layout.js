document.addEventListener("DOMContentLoaded", () => {
  const inject = async (id, file) => {
    const res = await fetch(file);
    const html = await res.text();
    document.getElementById(id).innerHTML = html;
  };

  inject("announcement-bar-container", "layout/announcement-bar.html");
  inject("footer-container", "layout/footer.html");
});
