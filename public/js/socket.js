const socket = io();
window.socket = socket;
document.addEventListener("DOMContentLoaded", () => {
  socket.on("tournaments:update", (data) => {
    if (data.type === "create" && typeof showToast === "function") {
      const settings = window.currentUser?.notificationSettings;
      if (!settings || settings.newTournament !== false) {
        showToast(`🏆 Nuovo torneo pubblicato: ${data.tournament.title}!`, "success");
      }
    }
    if (data.type === "update" && data.action === "status_change" && typeof showToast === "function") {
      const t = data.tournament;
      const user = window.currentUser;
      const settings = user?.notificationSettings;
      const isSubscribed = user?.tournaments?.includes(t._id);
      if (!isSubscribed) {
        if (t.status === "In Corso") {
          if (!settings || settings.tournamentStart !== false) {
            showToast(`Il torneo ${t.title} è iniziato!`, "info");
          }
        } else if (t.status === "Concluso") {
          if (!settings || settings.tournamentEnd !== false) {
            showToast(`Il torneo ${t.title} si è concluso.`, "info");
          }
        } else if (t.status === "Pausa") {
          if (!settings || settings.tournamentUpdates !== false) {
            showToast(`Le iscrizioni al torneo ${t.title} sono in pausa.`, "warning");
          }
        } else if (t.status === "Aperto") {
          if (!settings || settings.tournamentUpdates !== false) {
            showToast(`Le iscrizioni al torneo ${t.title} son state riaperte!`, "success");
          }
        }
      }
    }
    if (typeof loadAdminTournaments === "function") loadAdminTournaments();
    if (typeof loadTournaments === "function") loadTournaments();
    if (typeof loadTournament === "function") loadTournament();
    setTimeout(() => {
      if (typeof loadNotifications === "function") loadNotifications();
    }, 500);
  });
  socket.on("subscriptions:update", (data) => {
    if (typeof loadAdminTournaments === "function") loadAdminTournaments();
    if (typeof loadTournaments === "function") loadTournaments();
    if (typeof loadTournament === "function") loadTournament();
  });
  socket.on("leaderboard:update", (data) => {
    if (typeof loadLeaderboard === "function") loadLeaderboard();
  });
  socket.on("memory:update", (data) => {
    if (data.type === "create" || data.type === "delete") {
      if (typeof loadMemories === "function") loadMemories();
      if (typeof loadMyMemories === "function") loadMyMemories();
      return;
    }
    const { id, likes, shares } = data;
    const card = document.getElementById(`memory-${id}`);
    if (card) {
      const likeBtn = card.querySelector(".fa-heart").closest("button");
      if (likeBtn) {
        const span = likeBtn.querySelector("span");
        if (span) span.textContent = ` ${likes}`;
      }
      const shareBtn = card.querySelector(".fa-share").closest("button");
      if (shareBtn) {
        const span = shareBtn.querySelector("span");
        if (span) span.textContent = ` ${shares}`;
      }
    }
    const modal = document.querySelector(
      `.media-modal-overlay[data-memory-id="${id}"]`,
    );
    if (modal) {
      const likeCount = modal.querySelector(".like-count");
      if (likeCount) likeCount.textContent = likes;
      const shareCount = modal.querySelector(".share-count");
      if (shareCount) shareCount.textContent = shares;
    }
  });
  socket.on("user:update", (data) => {
    if (typeof loadUserProfile === "function") {
      const path = window.location.pathname;
      const viewedUser = document.getElementById("profile-username")?.textContent;
      if (path.includes("/profile") && (viewedUser === data.username || !viewedUser)) {
        loadUserProfile(viewedUser === data.username ? data.username : null);
      }
    }
  });
  socket.on("notification", (data) => {
    if (!data.silent && typeof showToast === "function") {
      showToast(data.message, "info");
    }
    if (typeof loadNotifications === "function") loadNotifications();
  });
  socket.on("profile:update", (data) => {
    const profileUsername = document.getElementById("profile-username")?.textContent;
    if (profileUsername === data.username) {
      const countSpan = document.getElementById("profile-likes-count");
      if (countSpan) {
        countSpan.textContent = data.profileLikesCount;
        const btn = countSpan.closest("button");
        if (btn) {
           const icon = btn.querySelector("i");
           if (icon) {
             icon.animate([{ transform: "scale(1)" }, { transform: "scale(1.4)" }, { transform: "scale(1)" }], { duration: 300 });
           }
        }
      }
    }
  });
});