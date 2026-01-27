window.enablePageInteractions = () => {
  const selector = "button, .btn, .btn-icon, .social-pill, .btn-discord, .btn-visit, .btn-share, .btn-primary, input[type='submit'], input[type='button'], .navbar-actions a";
  const safeLoadElements = document.querySelectorAll(selector);
  safeLoadElements.forEach(el => {
      el.style.pointerEvents = "";
      el.style.opacity = "";
  });
};

document.addEventListener("DOMContentLoaded", () => {
  const selector = "button, .btn, .btn-icon, .social-pill, .btn-discord, .btn-visit, .btn-share, .btn-primary, input[type='submit'], input[type='button'], .navbar-actions a";
  const safeLoadElements = document.querySelectorAll(selector);
  
  safeLoadElements.forEach(el => {
      el.style.pointerEvents = "none";
      el.style.opacity = "0.6";
      el.style.transition = "opacity 0.3s ease";
  });

  // Fallback di sicurezza: se le API falliscono o sono lente, attiva comunque dopo 8s
  setTimeout(window.enablePageInteractions, 8000);
});