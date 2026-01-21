document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  if (
    path.includes("tornei") ||
    path === "/" ||
    path.includes("index.html")
  ) {
    loadTournaments();
  }

  if (
    path.includes("classifica") ||
    path === "/" ||
    path.includes("index.html")
  ) {
    loadLeaderboard();
  }

  if (
    path.includes("memories") ||
    path === "/" ||
    path.includes("index.html")
  ) {
    loadMemories();
  }

  if (
    path.includes("staff") ||
    path === "/" ||
    path.includes("index.html")
  ) {
    loadStaff();
  }
});

async function loadTournaments() {
  try {
    const res = await fetch("/api/tournaments", { credentials: "include" });
    const tournaments = await res.json();

    let user = null;
    try {
      const userRes = await fetch("/api/me", { credentials: "include" });
      if (userRes.ok) user = await userRes.json();
    } catch {}
    const container =
      document.querySelector("#tornei .grid-3") ||
      document.querySelector(".grid-3");

    if (!container) return;

    if (tournaments.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-trophy"></i>
            <h3>Nessun Torneo Disponibile</h3>
            <p>Resta sintonizzato per i prossimi eventi!</p>
        </div>`;
      return;
    }

    container.innerHTML = "";

    const isHome = !window.location.pathname.includes("tornei");
    const itemsToShow = isHome ? tournaments.slice(0, 3) : tournaments;

    itemsToShow.forEach((t) => {
      const bgStyle = t.image
        ? `background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.9)), url('${t.image}') center/cover no-repeat;`
        : "";
      const textStyle = t.image
        ? "text-shadow: 0 2px 4px rgba(0,0,0,0.8); color: #fff;"
        : "";

      let isSubscribed = false;
      if (user && Array.isArray(t.subscribers)) {
        isSubscribed = t.subscribers.some(
          (sub) => sub.discordId === user.discordId,
        );
      }

      let buttonLabel = "Iscriviti Ora";
      let buttonAction = "subscribe";

      if (!user) {
        buttonLabel = "Accedi per Iscriverti";
        buttonAction = "login";
      } else if (isSubscribed) {
        buttonLabel = "Disiscriviti";
        buttonAction = "unsubscribe";
      }

      const shareLink = `${window.location.origin}/torneo/${t._id}`;

      const card = `
        <div class="card tournament-card" data-tid="${t._id}" data-format="${t.format || "solo"}" style="${bgStyle}; cursor: pointer;">
          <div class="card-icon"><i class="fas fa-gamepad"></i></div>
          <h3 style="${textStyle}">${t.title}</h3>
          <p style="margin: 0.5rem 0; ${textStyle}">Data: ${new Date(t.date).toLocaleDateString()} ${new Date(t.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          <p style="margin-bottom: 1.5rem; ${textStyle}">Montepremi: <strong>${t.prize}</strong></p>
          <p style="margin-bottom: 1.5rem; ${textStyle}">Stato: <span class="status-${t.status === "Aperto" ? "open" : t.status === "In Corso" ? "live" : "closed"}">${t.status}</span></p>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 1rem;">
            <button class="btn-visit btn-tournament-action" data-action="${buttonAction}" data-id="${t._id}" style="cursor: pointer;">${buttonLabel}</button>
            <button class="btn-share" data-link="${shareLink}"><i class="fas fa-share"></i> Condividi </button>
          </div>
        </div>
      `;
      container.innerHTML += card;
    });

    setTimeout(() => {
      document.querySelectorAll(".tournament-card").forEach((card) => {
        card.addEventListener("click", (e) => {
          if (e.target.closest("button")) return;
          const tid = card.getAttribute("data-tid");
          window.location.href = `/torneo/${tid}`;
        });
      });

      document.querySelectorAll(".btn-share").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const link = btn.getAttribute("data-link");
          navigator.clipboard.writeText(link).then(() => {
            if (typeof showToast === "function")
              showToast("Link torneo copiato!", "success");
          });
        });
      });

      document.querySelectorAll(".btn-tournament-action").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const action = btn.getAttribute("data-action");
          const tid = btn.getAttribute("data-id");
          const card = btn.closest(".tournament-card");
          const format = card ? card.getAttribute("data-format") : "solo";

          if (action === "login") {
            window.location.href = "/auth/discord";
            return;
          }

          if (action === "subscribe") {
            if (format === "solo") {
              btn.disabled = true;
              await joinTournament(tid, []);
            } else {
              showJoinTeamModal(tid, format);
            }
          } else if (action === "unsubscribe") {
            btn.disabled = true;
            await unsubscribeTournament(tid);
          }
          await loadTournaments();
        });
      });
    }, 100);

    async function joinTournament(id, teammates = []) {
      try {
        const res = await fetch(`/api/tournaments/${id}/join`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teammates }),
        });
        if (res.status === 401) {
          showToast("Devi effettuare il login per iscriverti!", "error");
          return;
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          showToast(
            `Errore Server: ${res.status} (Riavvia il backend)`,
            "error",
          );
          return;
        }
        const data = await res.json();
        if (data && data.message) showToast(data.message, "success");
      } catch (err) {
        showToast("Errore durante l'iscrizione", "error");
      }
    }
  } catch (err) {
    console.error("Errore caricamento tornei", err);
  }
}

function showJoinTeamModal(tid, format) {
  const existingModal = document.querySelector(".modal-overlay");
  if (existingModal) existingModal.remove();

  const teammateCount = format === "duo" ? 1 : 2;
  let inputsHtml = "";
  for (let i = 1; i <= teammateCount; i++) {
    inputsHtml += `
      <div style="margin-bottom:1rem; position: relative;">
        <label style="display:block;margin-bottom:0.3rem; color: var(--primary-2);">Compagno ${i} (Nickname)</label>
        <input name="teammate${i}" class="teammate-input" data-index="${i}" type="text" required autocomplete="off" style="width:100%;padding:0.5rem;border-radius:6px;border:1px solid #333;background:#23272f;color:#fff;">
        <div id="suggestions-${i}" style="position: absolute; top: 100%; left: 0; width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 0 0 6px 6px; z-index: 100; display: none; max-height: 150px; overflow-y: auto;"></div>
      </div>
    `;
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.background = "rgba(0,0,0,0.7)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = 9999;

  overlay.innerHTML = `
    <div class="modal" style="background: #181a20; padding: 2rem; border-radius: 16px; width: 100%; max-width: 400px; position: relative;">
      <button class="modal-close" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:1.5rem;color:#fff;cursor:pointer;">&times;</button>
      <h2 style="margin-bottom:1.2rem;text-align:center; color: var(--primary-2);">Iscrizione Team ${format.toUpperCase()}</h2>
      <p style="margin-bottom:1.5rem; text-align:center; color: #94a3b8;">Inserisci i nickname dei tuoi compagni.</p>
      <form id="join-team-form">
        ${inputsHtml}
        <button type="submit" class="btn-visit" style="width:100%; margin-top: 1rem;">Conferma Iscrizione</button>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector(".modal-close").onclick = () => overlay.remove();

  const inputs = overlay.querySelectorAll(".teammate-input");
  inputs.forEach((input) => {
    const idx = input.getAttribute("data-index");
    const box = overlay.querySelector(`#suggestions-${idx}`);

    input.addEventListener("input", async (e) => {
      const val = e.target.value.trim();
      if (val.length < 2) {
        box.style.display = "none";
        return;
      }
      try {
        const res = await fetch(`/api/users/search?q=${val}`);
        const users = await res.json();
        box.innerHTML = "";
        if (users.length > 0) {
          box.style.display = "block";
          users.forEach((u) => {
            const div = document.createElement("div");
            div.style.padding = "8px 12px";
            div.style.cursor = "pointer";
            div.style.display = "flex";
            div.style.alignItems = "center";
            div.style.gap = "10px";
            div.style.borderBottom = "1px solid #334155";
            div.onmouseover = () => (div.style.background = "#334155");
            div.onmouseout = () => (div.style.background = "transparent");

            let avatar = "https://cdn.discordapp.com/embed/avatars/0.png";
            if (u.avatar)
              avatar = `https://cdn.discordapp.com/avatars/${u.discordId}/${u.avatar}.png`;

            if (!u.minecraftUsername) {
              div.innerHTML = `<img src="${avatar}" style="width:20px;height:20px;border-radius:50%; opacity: 0.5;"> <span style="color:#94a3b8;">${u.username} <small>(No MC Nick)</small></span>`;
              div.style.cursor = "not-allowed";
            } else {
              div.innerHTML = `<img src="${avatar}" style="width:20px;height:20px;border-radius:50%;"> <span style="color:#fff;">${u.username}</span>`;
              div.onclick = () => {
                input.value = u.username;
                box.style.display = "none";
              };
            }
            box.appendChild(div);
          });
        } else {
          box.style.display = "none";
        }
      } catch (err) {}
    });

    input.addEventListener("blur", () => {
      setTimeout(() => (box.style.display = "none"), 200);
    });
  });

  document.getElementById("join-team-form").onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const teammates = Array.from(formData.values()).filter(
      (v) => v.trim() !== "",
    );
    overlay.remove();
    await loadTournaments();

    try {
      const res = await fetch(`/api/tournaments/${tid}/join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teammates }),
      });
      const data = await res.json();
      if (res.ok) {
        overlay.remove();
        showToast("Iscrizione completata!", "success");
        if (typeof loadTournaments === "function") loadTournaments();
      } else {
        showToast(data.message || "Errore", "error");
      }
    } catch (err) {
      showToast("Errore di connessione", "error");
    }
  };
}

async function unsubscribeTournament(id) {
  try {
    const res = await fetch(`/api/tournaments/${id}/unsubscribe`, {
      method: "POST",
      credentials: "include",
    });
    if (res.status === 401) {
      showToast("Devi effettuare il login per disiscriverti!", "error");
      return;
    }
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      showToast(`Errore Server: ${res.status} (Riavvia il backend)`, "error");
      return;
    }
    const data = await res.json();
    if (data && data.message) showToast(data.message, "success");
  } catch (err) {
    showToast("Errore durante la disiscrizione", "error");
  }
}

async function loadMemories() {
  try {
    const res = await fetch("/api/memories");
    const memories = await res.json();

    const container =
      document.querySelector("#memories .grid-3") ||
      document.querySelector(".grid-3");

    if (!container) return;

    if (memories.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
        '<i class="fas fa-camera-retro"></i>' +
        "<h3>Nessuna Memory Presente</h3>" +
        "<p>Carica la tua prima memory!</p>" +
        "</div>";
      return;
    }

    container.innerHTML = "";

    const isHome =
      window.location.pathname.endsWith("index.html") ||
      window.location.pathname === "/";
    const itemsToShow = isHome ? memories.slice(0, 3) : memories;

    itemsToShow.forEach((m) => {
      let media = "";
      if (m.videoUrl && m.videoUrl.includes("youtube")) {
        const match =
          m.videoUrl.match(/[?&]v=([^&#]+)/) ||
          m.videoUrl.match(/youtu\.be\/([^?&#]+)/);
        const videoId = match ? match[1] : null;
        if (videoId) {
          media = `<iframe width="100%" height="180" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="border-radius:10px;"></iframe>`;
        } else {
          media = `<a href="${m.videoUrl}" target="_blank">${m.videoUrl}</a>`;
        }
      } else if (
        m.videoUrl &&
        (m.videoUrl.endsWith(".jpg") ||
          m.videoUrl.endsWith(".png") ||
          m.videoUrl.endsWith(".jpeg") ||
          m.videoUrl.endsWith(".webp"))
      ) {
        media = `<img src="${m.videoUrl}" alt="Memory" style="width:100%;height:180px;object-fit:cover;border-radius:10px;">`;
      } else if (m.videoUrl) {
        media = `<a href="${m.videoUrl}" target="_blank">${m.videoUrl}</a>`;
      }

      const date = m.createdAt
        ? new Date(m.createdAt).toLocaleDateString()
        : "";
      const card = `
        <div class="card memory-card" style="min-height:320px;display:flex;flex-direction:column;justify-content:space-between;">
          ${media}
          <h3 style="margin:0.7rem 0 0.3rem 0;">${m.title || "Memory"}</h3>
          <p style="font-size:0.98em;color:#aaa;margin-bottom:0.5rem;">${date}</p>
          <p style="margin-bottom:0.7rem;">${m.description ? m.description : ""}</p>
        </div>
      `;
      container.innerHTML += card;
    });
  } catch (err) {
    console.error("Errore caricamento memories", err);
  }
}

function openAddMemoryModal() {
  const existingModal = document.querySelector(".modal-overlay");
  if (existingModal) existingModal.remove();

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.background = "rgba(0,0,0,0.6)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = 9999;

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.background = "#181a20";
  modal.style.padding = "2rem";
  modal.style.borderRadius = "16px";
  modal.style.boxShadow = "0 8px 32px rgba(0,0,0,0.25)";
  modal.style.width = "100%";
  modal.style.maxWidth = "420px";
  modal.style.position = "relative";

  modal.innerHTML = `
    <button class="modal-close" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:1.5rem;color:#fff;cursor:pointer;" title="Chiudi">&times;</button>
    <h2 style="margin-bottom:1.2rem;text-align:center; color: var(--primary-2);">Aggiungi una Memory</h2>
    <form id="add-memory-form" autocomplete="off">
      <div style="margin-bottom:1rem;">
        <label for="memory-title" style="display:block;margin-bottom:0.3rem; color: var(--primary-2);">Titolo</label>
        <input id="memory-title" name="title" type="text" maxlength="60" required style="width:100%;padding:0.5rem;border-radius:6px;border:1px solid #333;background:#23272f;color:#fff;">
      </div>
      <div style="margin-bottom:1rem;">
        <label for="memory-description" style="display:block;margin-bottom:0.3rem; color: var(--primary-2);">Descrizione</label>
        <textarea id="memory-description" name="description" maxlength="200" rows="3" style="resize: vertical; max-height: 300px; min-height: 100px; width:100%; padding:0.5rem;border-radius:6px;border:1px solid #333;background:#23272f;color:#fff;"></textarea>
      </div>
      <div style="margin-bottom:1.2rem;">
        <label for="memory-video" style="display:block;margin-bottom:0.3rem; color: var(--primary-2);">Link Video/Immagine</label>
        <input id="memory-video" name="videoUrl" type="url" required placeholder="https://..." style="width:100%; padding:0.5rem;border-radius:6px;border:1px solid #333;background:#23272f;color:#fff;">
      </div>
      <button type="submit" class="btn-primary" style="width:100%;font-size:1.1rem;">Carica Memory</button>
    </form>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  modal.querySelector(".modal-close").onclick = () => overlay.remove();
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };

  const form = modal.querySelector("#add-memory-form");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const title = form.title.value.trim();
    const description = form.description.value.trim();
    const videoUrl = form.videoUrl.value.trim();
    if (!title || !videoUrl) return;
    try {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, videoUrl }),
      });
      if (res.ok) {
        overlay.remove();
        if (typeof showToast === "function")
          showToast("Memory caricata!", "success");

        if (typeof loadMemories === "function") loadMemories();
        if (typeof loadMyMemories === "function") loadMyMemories();
      } else {
        const data = await res.json().catch(() => ({}));
        if (typeof showToast === "function")
          showToast(data.message || "Errore nel caricamento", "error");
      }
    } catch (err) {
      if (typeof showToast === "function") showToast("Errore di rete", "error");
    }
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const addBtn = document.getElementById("add-memory-btn");
  if (addBtn) {
    addBtn.addEventListener("click", openAddMemoryModal);
  }
});

async function loadLeaderboard() {
  try {
    const res = await fetch("/api/leaderboard");
    const users = await res.json();

    const podiumContainer = document.querySelector("#classifica .grid-3");
    if (
      podiumContainer &&
      (window.location.pathname === "/" ||
        window.location.pathname.includes("index.html"))
    ) {
      if (users.length === 0) return;

      podiumContainer.innerHTML = "";
      const top3 = [users[1], users[0], users[2]];

      top3.forEach((u, idx) => {
        if (!u) return;
        const rank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
        const rankClass = `rank-${rank}`;
        const iconColor =
          rank === 1 ? "#ffd700" : rank === 2 ? "#c0c0c0" : "#cd7f32";
        const icon = rank === 1 ? "fa-trophy" : "fa-medal";

        const card = `
              <div class="card ${rankClass}">
                <div class="card-icon">
                  <i class="fas ${icon}" style="color: ${iconColor}"></i>
                </div>
                <h3>${rank}. ${u.username}</h3>
                <p>${u.points} Punti</p>
              </div>
            `;
        podiumContainer.innerHTML += card;
      });
    }

    const tableBody = document.querySelector("#leaderboard-body");
    if (tableBody) {
      tableBody.innerHTML = "";
      users.forEach((u, i) => {
        const row = `
                <tr>
                    <td>#${i + 1}</td>
                    <td>${u.username}</td>
                    <td>${u.wins}</td>
                    <td>${u.kills}</td>
                    <td>${u.bedBroken}</td>
                    <td><strong>${u.points}</strong></td>
                </tr>
            `;
        tableBody.innerHTML += row;
      });
    }
  } catch (err) {
    console.error("Errore caricamento classifica", err);
  }
}

async function loadStaff() {
  try {
    const res = await fetch("/api/staff");
    const staff = await res.json();

    const container =
      document.getElementById("staff-grid") ||
      document.querySelector("#staff .grid-3");

    if (!container) return;

    container.innerHTML = "";

    staff.forEach((s) => {
      let avatarUrl = "https://cdn.discordapp.com/embed/avatars/0.png";
      if (s.avatar) {
        avatarUrl = `https://cdn.discordapp.com/avatars/${s.discordId}/${s.avatar}.png`;
      }

      const card = `
        <div class="card staff-card" style="text-align: center; padding: 2rem;">
            <div style="width: 100px; height: 100px; margin: 0 auto 1.5rem; border-radius: 50%; overflow: hidden; border: 3px solid ${s.roleColor}; box-shadow: 0 0 15px ${s.roleColor}40;">
                <img src="${avatarUrl}" alt="${s.username}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <h3 style="color: ${s.roleColor}; margin-bottom: 0.5rem; text-transform: uppercase; font-size: 0.9rem; letter-spacing: 1px;">${s.role}</h3>
            <h2 style="margin-bottom: 1rem; font-size: 1.5rem; color: var(--light);">${s.username}</h2>
            <p style="color: #94a3b8; font-size: 0.95rem; line-height: 1.6;">${s.description}</p>
            <div style="margin-top: 1.5rem; color: ${s.roleColor}; font-size: 1.2rem;">
                <i class="${s.icon}"></i>
            </div>
        </div>
      `;
      container.innerHTML += card;
    });
  } catch (err) {
    console.error("Errore caricamento staff", err);
  }
}
