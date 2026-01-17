const menu = document.querySelector("#mobile-menu");
const navContent = document.querySelector(".navbar-content");

if (menu) {
  menu.addEventListener("click", () => {
    menu.classList.toggle("is-active");
    navContent.classList.toggle("active");
  });
}

// Gestione Login/UI Utente
document.addEventListener("DOMContentLoaded", async () => {
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
            <div class="user-info">
                <img src="${avatarUrl}" alt="${user.username}">
            </div>
            <a href="/logout" class="btn-icon logout-btn" title="Logout"><i class="fas fa-sign-out-alt"></i></a>
        </div>
    `;
}
