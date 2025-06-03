document.addEventListener("DOMContentLoaded", () => {
  const inject = async (id, file) => {
    const res = await fetch(file);
    const html = await res.text();
    document.getElementById(id).innerHTML = html;

    if (typeof callback === "function") {
      callback(); // run animation code
    }
  };

  // Inject announcement bar + fade logic
  inject("announcement-bar-container", "layout/announcement-bar.html", () => {
    const messages = document.querySelectorAll(".announcement-messages p");
    let index = 0;

    if (messages.length > 0) {
      messages[0].classList.add("active");

      setInterval(() => {
        messages[index].classList.remove("active");
        index = (index + 1) % messages.length;
        messages[index].classList.add("active");
      }, 6000);
    }
  });

  // Inject footer
  inject("footer-container", "layout/footer.html");
});
