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



  const notifWrapper = document.querySelector(".notification-wrapper");
  const mobileMenu = document.getElementById("mobile-menu");
  const userProfile = document.querySelector(".user-profile");
  const userChevron = document.querySelector(".user-info .fa-chevron-down");


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



    if (notifWrapper && mobileMenu && navWrapper) {
      if (notifWrapper.parentElement !== navWrapper) {
        navWrapper.insertBefore(notifWrapper, mobileMenu);
        notifWrapper.style.marginRight = "15px";
        notifWrapper.style.marginLeft = "auto";
        notifWrapper.style.display = "flex";
        notifWrapper.style.alignItems = "center";
        const icon = notifWrapper.querySelector("i");
        if (icon) icon.style.fontSize = "1.5rem";
      }
    }
    if (userChevron) userChevron.style.display = "none";

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



    if (notifWrapper && userProfile) {
      if (notifWrapper.parentElement !== userProfile) {
        userProfile.insertBefore(notifWrapper, userProfile.firstChild);
        notifWrapper.style.marginRight = "";
        notifWrapper.style.marginLeft = "";
        notifWrapper.style.display = "";
        notifWrapper.style.alignItems = "";
        const icon = notifWrapper.querySelector("i");
        if (icon) icon.style.fontSize = "";
      }
    }
    if (userChevron) userChevron.style.display = "";

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
      loadNotifications(); // Carica le notifiche
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
  const existingPanel = document.getElementById("notification-panel");
  if (existingPanel) existingPanel.remove();

  const existingWrapper = document.querySelector(".notification-wrapper");
  if (existingWrapper) existingWrapper.remove();

  actionsContainer.innerHTML = `
        <div class="user-profile">
            <div class="notification-wrapper" style="position: relative;">
                <button id="nav-notification-btn" class="btn-icon" style="background: transparent; color: #fff; margin-right: 5px; width: 40px; height: 40px; position: relative;">
                    <i class="fas fa-bell"></i>
                    <span id="nav-notification-badge" style="display: none; position: absolute; top: 8px; right: 8px; width: 8px; height: 8px; background: #ef4444; border-radius: 50%;"></span>
                </button>
            </div>

            <div class="user-menu-wrapper" style="position: relative;">
                <div class="user-info" id="user-menu-trigger" style="cursor: pointer; display: flex; align-items: center; gap: 10px;">
                    <img src="${avatarUrl}" alt="${user.username}">
                    <span class="navbar-username">${user.username}</span>
                    <i class="fas fa-chevron-down" style="font-size: 0.8rem; color: #94a3b8; margin-left: 5px; transition: transform 0.2s;"></i>
                </div>
                
                <div id="user-dropdown" style="display: none; position: absolute; top: 120%; right: 0; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 8px; min-width: 180px; z-index: 1000; box-shadow: 0 10px 25px rgba(0,0,0,0.5); flex-direction: column; gap: 5px;">
                    <a href="/profile" class="dropdown-item" style="display: flex; align-items: center; padding: 10px 12px; color: #e2e8f0; text-decoration: none; border-radius: 8px; transition: background 0.2s; font-size: 0.95rem;">
                        <i class="fas fa-user" style="margin-right: 10px; color: var(--primary-2); width: 20px; text-align: center;"></i> Profilo
                    </a>
                    <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 4px 0;"></div>
                    <a href="/logout" class="dropdown-item" style="display: flex; align-items: center; padding: 10px 12px; color: #f87171; text-decoration: none; border-radius: 8px; transition: background 0.2s; font-size: 0.95rem;">
                        <i class="fas fa-sign-out-alt" style="margin-right: 10px; width: 20px; text-align: center;"></i> Logout
                    </a>
                </div>
            </div>
        </div>
    `;

  if (window.socket) {
    window.socket.emit("join", user.discordId);
  }

  const panel = document.createElement("div");
  panel.id = "notification-panel";
  panel.className = "notification-panel";
  panel.innerHTML = `
      <div class="notif-header">
          <h3>Notifiche</h3>
          <button id="close-notif-mobile" class="btn-icon" style="background: transparent; color: #fff;"><i class="fas fa-times"></i></button>
      </div>
      <div class="notif-content">
          <div class="notif-loader" style="padding: 20px; text-align: center; color: #94a3b8;">Caricamento...</div>
      </div>
  `;
  document.body.appendChild(panel);

  const notifBtn = document.getElementById("nav-notification-btn");
  const closeMobile = panel.querySelector("#close-notif-mobile");

  const positionPanel = () => {
    if (window.innerWidth > 768) {
      const rect = notifBtn.getBoundingClientRect();
      panel.style.position = "fixed";
      panel.style.top = `${rect.bottom + 10}px`;
      panel.style.left = `${rect.right - 320}px`;
      panel.style.width = "320px";
      panel.style.height = "auto";
      panel.style.borderRadius = "16px";
    } else {
      panel.style.position = "fixed";
      panel.style.top = "0";
      panel.style.left = "0";
      panel.style.width = "100%";
      panel.style.height = "100%";
      panel.style.borderRadius = "0";
    }
  };

  if (notifBtn && panel) {
    notifBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (panel.classList.contains("active")) {
        panel.classList.remove("active");
        document.body.style.overflow = "";
      } else {
        positionPanel();
        panel.classList.add("active");
        if (window.innerWidth <= 768) {
          document.body.style.overflow = "hidden";
        }
      }
    });

    window.addEventListener("resize", () => {
      if (panel.classList.contains("active")) positionPanel();
    });

    document.addEventListener("click", (e) => {
      if (panel.classList.contains("active") && !panel.contains(e.target) && !notifBtn.contains(e.target)) {
        panel.classList.remove("active");
        document.body.style.overflow = "";
      }
    });
    if (closeMobile) {
      closeMobile.addEventListener("click", (e) => {
        e.stopPropagation();
        panel.classList.remove("active");
        document.body.style.overflow = "";
      });
    }
  }

  const userTrigger = document.getElementById("user-menu-trigger");
  const userDropdown = document.getElementById("user-dropdown");

  if (userTrigger && userDropdown) {
    userTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (window.innerWidth <= 1250) {
        window.location.href = "/profile";
        return;
      }
      const isVisible = userDropdown.style.display === "flex";
      userDropdown.style.display = isVisible ? "none" : "flex";
      const chevron = userTrigger.querySelector(".fa-chevron-down");
      if(chevron) chevron.style.transform = isVisible ? "rotate(0deg)" : "rotate(180deg)";
    });

    document.addEventListener("click", (e) => {
      if (userDropdown.style.display === "flex" && !userDropdown.contains(e.target) && !userTrigger.contains(e.target)) {
        userDropdown.style.display = "none";
        const chevron = userTrigger.querySelector(".fa-chevron-down");
        if(chevron) chevron.style.transform = "rotate(0deg)";
      }
    });

    const items = userDropdown.querySelectorAll(".dropdown-item");
    items.forEach(item => {
        item.addEventListener("mouseenter", () => item.style.background = "rgba(255,255,255,0.05)");
        item.addEventListener("mouseleave", () => item.style.background = "transparent");
    });
  }
}

async function loadNotifications() {
  try {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const notifs = await res.json();
    
    const badge = document.getElementById("nav-notification-badge");
    const content = document.querySelector(".notif-content");
    
    const unreadCount = notifs.filter(n => !n.read).length;
    
    if (badge) {
      if (unreadCount > 0) {
        badge.style.display = "block";
        // Animazione pulse se ci sono nuove notifiche
        badge.style.animation = "pulse 2s infinite";
      } else {
        badge.style.display = "none";
        badge.style.animation = "none";
      }
    }

    if (content) {
      if (notifs.length === 0) {
        content.innerHTML = `
          <div style="padding: 30px; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 10px;">
              <i class="far fa-bell-slash" style="font-size: 2rem; opacity: 0.5;"></i>
              <span>Nessuna nuova notifica</span>
          </div>`;
      } else {
        content.innerHTML = "";
        notifs.forEach(n => {
          const isInvite = n.type === 'tournament_invite';
          const item = document.createElement("div");
          item.className = `notif-item ${n.read ? 'read' : 'unread'}`;
          item.style.cursor = "pointer";
          item.innerHTML = `
            <div class="notif-icon"><i class="fas ${isInvite ? 'fa-envelope-open-text' : 'fa-info-circle'}"></i></div>
            <div class="notif-body">
              <p>${n.message}</p>
              <span class="notif-time">${new Date(n.createdAt).toLocaleDateString()}</span>
              ${isInvite && !n.read ? `
                <div class="notif-actions" style="display: flex; gap: 10px; margin-top: 10px;">
                  <button class="btn-accept" onclick="respondToInvite('${n._id}', 'accept')" style="background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); padding: 6px 12px; border-radius: 6px; cursor: pointer; flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; transition: 0.2s;"><i class="fas fa-check"></i> Accetta</button>
                  <button class="btn-decline" onclick="respondToInvite('${n._id}', 'decline')" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 6px 12px; border-radius: 6px; cursor: pointer; flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; transition: 0.2s;"><i class="fas fa-times"></i> Rifiuta</button>
                </div>
              ` : ''}
            </div>
          `;
          
          item.onclick = async (e) => {
            if (e.target.closest("button")) return; // Ignora click sui pulsanti accetta/rifiuta

            if (!n.read) {
              try {
                await fetch(`/api/notifications/${n._id}/read`, { method: "POST" });
              } catch(err) {}
            }

            if (n.data && n.data.link) {
              window.location.href = n.data.link;
            } else if (n.data && n.data.tournamentId) {
              window.location.href = `/torneo/${n.data.tournamentId}`;
            } else {
              loadNotifications(); // Ricarica solo per aggiornare lo stato visivo se non c'è link
            }
          };

          content.appendChild(item);
        });
      }
    }
  } catch (e) {
    console.error("Errore notifiche", e);
  }
}

window.respondToInvite = async (id, action) => {
  try {
    const res = await fetch(`/api/notifications/${id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    if (res.ok) {
      showToast(action === 'accept' ? "Invito accettato!" : "Invito rifiutato", action === 'accept' ? "success" : "info");
      loadNotifications();
    } else {
      showToast("Errore nella risposta", "error");
    }
  } catch (e) {
    showToast("Errore di connessione", "error");
  }
};

async function markAsRead(id) {
  await fetch(`/api/notifications/${id}/read`, { method: "POST" });
  loadNotifications();

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
