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

  socket.on("leaderboard:update", (data) => {
    // to implement: refresh leaderboard if on leaderboard page
  });
});
