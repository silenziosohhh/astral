const menu = document.querySelector("#mobile-menu");
const navContent = document.querySelector(".navbar-content");

if (menu) {
  menu.addEventListener("click", () => {
    menu.classList.toggle("is-active");
    navContent.classList.toggle("active");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  // Mostra notifica beta solo al primo accesso
  if (!localStorage.getItem("astral_beta_notice_shown")) {
    showToast(
      "Il sito è in beta! Potresti riscontrare bug o problemi.",
      "info",
    );
    localStorage.setItem("astral_beta_notice_shown", "1");
  }

  try {
    const response = await fetch("/me");
    if (response.ok) {
      const user = await response.json();
      updateNavbarUI(user);
    }
  } catch (error) {
    console.log("Utente non loggato");
  }
});

function updateNavbarUI(user) {
  const actionsContainer = document.querySelector(".navbar-login");
  const oldActionsContainer = document.querySelector(".navbar-actions");
  if (!actionsContainer) return;

  let avatarUrl = "https://cdn.discordapp.com/embed/avatars/0.png";
  if (user.avatar) {
    avatarUrl = `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`;
  }

  oldActionsContainer.style.display = "none";
  actionsContainer.style.display = "flex";

  actionsContainer.innerHTML = `
        <div class="user-profile">
            <a href="/pages/profile.html" class="user-info" style="text-decoration: none;">
                <img src="${avatarUrl}" alt="${user.username}">
            </a>
            <a href="/logout" class="btn-icon logout-btn" title="Logout"><i class="fas fa-sign-out-alt"></i></a>
        </div>
    `;
}

window.showToast = function (message, type = "info") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  let icon = "info-circle";
  if (type === "success") icon = "check-circle";
  if (type === "error") icon = "exclamation-circle";

  toast.innerHTML = `<i class="fas fa-${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
};
