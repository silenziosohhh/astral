const socket = io();
window.socket = socket;

document.addEventListener("DOMContentLoaded", () => {
  socket.on("tournaments:update", (data) => {
    if (data.type === "create" && typeof showToast === "function") {
      showToast(`🏆 Nuovo torneo pubblicato: ${data.tournament.title}!`, "success");
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
});
