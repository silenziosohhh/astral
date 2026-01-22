const socket = io();

document.addEventListener("DOMContentLoaded", () => {
  socket.on("tournaments:update", (data) => {
    if (typeof loadAdminTournaments === "function") {
      loadAdminTournaments();
    }
  });

  socket.on("subscriptions:update", (data) => {
    if (typeof loadAdminTournaments === "function") {
      loadAdminTournaments();
    }
  });

  socket.on("leaderboard:update", (data) => {});

  socket.on("memory:update", (data) => {
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
});
