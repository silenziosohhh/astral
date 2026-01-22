const menu = document.querySelector("#mobile-menu");
const navContent = document.querySelector(".navbar-content");

if (menu) {
  menu.addEventListener("click", () => {
    menu.classList.toggle("is-active");
    navContent.classList.toggle("active");
  });
}

function handleResponsiveAuth() {
  const width = window.innerWidth;
  const navContent = document.querySelector(".navbar-content");
  const loginContainer = document.querySelector(".navbar-login");
  const actionsContainer = document.querySelector(".navbar-actions");
  const searchTrigger = document.getElementById("nav-search-trigger");

  if (!navContent) return;
  const navWrapper = navContent.parentElement;

  if (width <= 1250) {
    if (loginContainer && loginContainer.parentElement !== navContent) {
      navContent.appendChild(loginContainer);
      loginContainer.style.width = "100%";
      loginContainer.style.justifyContent = "center";
      loginContainer.style.marginTop = "1rem";
    }
    if (actionsContainer && actionsContainer.parentElement !== navContent) {
      navContent.appendChild(actionsContainer);
      actionsContainer.style.width = "100%";
      actionsContainer.style.justifyContent = "center";
      actionsContainer.style.marginTop = "1rem";
    }
    if (searchTrigger) {
      navContent.prepend(searchTrigger);
      searchTrigger.style.margin = "1rem auto";
    }
  } else {
    if (loginContainer && loginContainer.parentElement === navContent) {
      navWrapper.appendChild(loginContainer);
      loginContainer.style.width = "";
      loginContainer.style.justifyContent = "";
      loginContainer.style.marginTop = "";
    }
    if (actionsContainer && actionsContainer.parentElement === navContent) {
      navWrapper.appendChild(actionsContainer);
      actionsContainer.style.width = "";
      actionsContainer.style.justifyContent = "";
      actionsContainer.style.marginTop = "";
    }
    if (searchTrigger && searchTrigger.parentElement === navContent) {
      navWrapper.appendChild(searchTrigger);
      searchTrigger.style.margin = "0 1rem 0 0";
      searchTrigger.style.marginLeft = "auto";
    }

    if (searchTrigger && searchTrigger.parentElement === navWrapper)
      navWrapper.appendChild(searchTrigger);
    if (actionsContainer && actionsContainer.parentElement === navWrapper)
      navWrapper.appendChild(actionsContainer);
    if (loginContainer && loginContainer.parentElement === navWrapper)
      navWrapper.appendChild(loginContainer);
  }
}

window.addEventListener("resize", handleResponsiveAuth);

document.addEventListener("DOMContentLoaded", async () => {
  handleResponsiveAuth();

  setupNavbarSearch();

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
      handleResponsiveAuth();
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
            <a href="/profile" class="user-info" style="text-decoration: none;">
                <img src="${avatarUrl}" alt="${user.username}">
                <span class="navbar-username">${user.username}</span>
            </a>
            <a href="/logout" class="btn-icon logout-btn" title="Logout">
                <i class="fas fa-sign-out-alt"></i>
                <span class="logout-text">Logout</span>
            </a>
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

function setupNavbarSearch() {
  const searchTrigger = document.getElementById("nav-search-trigger");
  if (!searchTrigger) return;

  searchTrigger.addEventListener("click", (e) => {
    e.preventDefault();
    openSearchModal();
  });
}

function openSearchModal() {
  if (document.querySelector(".search-modal-overlay")) return;

  const overlay = document.createElement("div");
  overlay.className = "search-modal-overlay";
  overlay.innerHTML = `
    <div class="search-modal-content">
        <div class="search-modal-header">
            <i class="fas fa-search search-icon"></i>
            <input type="text" id="modal-search-input" placeholder="Cerca utente..." autocomplete="off">
            <i class="fas fa-times search-close"></i>
        </div>
        <div class="search-results" id="modal-search-results"></div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  const input = overlay.querySelector("#modal-search-input");
  const resultsContainer = overlay.querySelector("#modal-search-results");
  const closeBtn = overlay.querySelector(".search-close");

  setTimeout(() => input.focus(), 50);

  const closeModal = () => {
    overlay.classList.add("closing");
    setTimeout(() => {
      overlay.remove();
      document.body.style.overflow = "";
    }, 300);
  };

  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  input.addEventListener(
    "input",
    debounce(async (e) => {
      const val = e.target.value.trim();

      if (val.length < 2) {
        resultsContainer.style.display = "none";
        resultsContainer.innerHTML = "";
        return;
      }

      try {
        const res = await fetch(`/api/users/search?q=${val}`);
        const users = await res.json();

        resultsContainer.innerHTML = "";
        if (users.length > 0) {
          resultsContainer.style.display = "block";
          users.forEach((u) => {
            let avatar = "https://cdn.discordapp.com/embed/avatars/0.png";
            if (u.avatar)
              avatar = `https://cdn.discordapp.com/avatars/${u.discordId}/${u.avatar}.png`;

            const a = document.createElement("a");
            a.className = "search-result-item";
            a.href = `/profile/${u.username}`;
            a.innerHTML = `
                            <img src="${avatar}" alt="${u.username}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                            <div style="display:flex; flex-direction:column;">
                                <span style="font-weight:600;">${u.username}</span>
                                ${u.minecraftUsername ? `<span style="font-size:0.75rem; color:#94a3b8;">${u.minecraftUsername}</span>` : ""}
                            </div>
                        `;
            a.addEventListener("click", closeModal);
            resultsContainer.appendChild(a);
          });
        } else {
          resultsContainer.style.display = "none";
        }
      } catch (err) {
        console.error(err);
      }
    }, 300),
  );
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}
