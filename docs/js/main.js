// main.js
// Runs in the browser on every page (linked at the bottom of each HTML
// file). Two jobs: toggle the mobile nav menu, and submit the contact
// form without a full page reload.

document.addEventListener("DOMContentLoaded", () => {
  // ---- Mobile nav toggle ----
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      links.classList.toggle("open");
    });
  }

  // ---- Contact form submission ----
  const form = document.querySelector("#contact-form");
  const status = document.querySelector("#form-status");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        message: form.message.value.trim(),
      };

      status.textContent = "Sending...";
      status.className = "form-status";

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();

        if (result.ok) {
          status.textContent = result.message;
          status.className = "form-status success";
          form.reset();
        } else {
          status.textContent = result.error || "Something went wrong.";
          status.className = "form-status error";
        }
      } catch (err) {
        status.textContent = "Network error. Please try WhatsApp instead.";
        status.className = "form-status error";
      }
    });
  }
});
