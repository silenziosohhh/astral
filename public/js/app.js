document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  if (path.includes("tornei") || path === "/" || path.includes("index.html")) {
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

  if (path.includes("staff") || path === "/" || path.includes("index.html")) {
    loadStaff();
  }

  const searchInput = document.getElementById("search-memories");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase();
      document.querySelectorAll(".memory-card").forEach((card) => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(term) ? "flex" : "none";
      });
    });
  }
});

window.openMediaModal = function (
  url,
  type,
  id,
  authorName,
  likes = 0,
  shares = 0,
  isLiked = false,
) {
  const existing = document.querySelector(".media-modal-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.className = "media-modal-overlay";
  overlay.setAttribute("data-memory-id", id);
  overlay.style.cssText =
    "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.9); backdrop-filter: blur(10px); z-index: 10000; display: flex; flex-direction: column; justify-content: center; align-items: center; animation: fadeIn 0.3s ease;";

  const mediaStyle =
    "max-width: 90vw; max-height: 85vh; width: auto; height: auto; border-radius: 16px; box-shadow: 0 0 40px rgba(0,0,0,0.5); object-fit: contain;";

  let content = "";
  if (type === "image") {
    content = `<img src="${url}" style="${mediaStyle}" onclick="event.stopPropagation()">`;
  } else if (type === "video") {
    content = `<video src="${url}" controls autoplay loop style="${mediaStyle}" onclick="event.stopPropagation()"></video>`;
  }

  const heartClass = isLiked ? "fas" : "far";
  const heartColor = isLiked ? "#ef4444" : "white";

  const actionsHtml = `
    <div style="position: absolute; right: 20px; bottom: 100px; display: flex; flex-direction: column; gap: 15px; z-index: 10001; align-items: center;">
        <div class="action-btn like-btn" onclick="event.stopPropagation(); toggleLike(this, '${id}')" style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.2s;">
            <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 12px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                <i class="${heartClass} fa-heart" style="font-size: 1.5rem; color: ${heartColor};"></i>
            </div>
            <span class="like-count" style="color: white; font-size: 0.75rem; margin-top: 4px; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${likes}</span>
        </div>
        <div class="action-btn share-btn" onclick="event.stopPropagation(); shareMemory('${id}', '${authorName}', 'Memory di ${authorName}', this)" style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.2s;">
            <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 12px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                <i class="fas fa-share" style="font-size: 1.5rem; color: white;"></i>
            </div>
            <span class="share-count" style="color: white; font-size: 0.75rem; margin-top: 4px; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${shares}</span>
        </div>
    </div>
    <button onclick="event.stopPropagation(); this.closest('.media-modal-overlay').remove()" style="position: absolute; top: 20px; left: 20px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; cursor: pointer; z-index: 10002; backdrop-filter: blur(5px); transition: 0.2s;">&times;</button>
  `;

  overlay.innerHTML = `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative;">${content}${actionsHtml}</div>`;

  document.body.appendChild(overlay);
  overlay.onclick = () => overlay.remove();

  const btns = overlay.querySelectorAll(".action-btn, button");
  btns.forEach((btn) => {
    btn.onmouseover = () => (btn.style.transform = "scale(1.1)");
    btn.onmouseout = () => (btn.style.transform = "scale(1)");
  });
};

window.toggleLike = async function (el, memoryId) {
  const icon = el.querySelector("i");
  const countSpan = el.querySelector(".like-count") || el.querySelector("span");

  const wasLiked = icon.classList.contains("fas");
  const currentCount = parseInt(countSpan ? countSpan.textContent : 0) || 0;

  if (wasLiked) {
    icon.classList.remove("fas");
    icon.classList.add("far");
    icon.style.color = el.classList.contains("action-btn")
      ? "white"
      : "#cbd5e1";
    if (countSpan)
      countSpan.textContent = el.classList.contains("action-btn")
        ? Math.max(0, currentCount - 1)
        : ` ${Math.max(0, currentCount - 1)}`;
  } else {
    icon.classList.remove("far");
    icon.classList.add("fas");
    icon.style.color = "#ef4444";
    icon.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.4)" },
        { transform: "scale(1)" },
      ],
      { duration: 300, easing: "cubic-bezier(0.175, 0.885, 0.32, 1.275)" },
    );
    if (countSpan)
      countSpan.textContent = el.classList.contains("action-btn")
        ? currentCount + 1
        : ` ${currentCount + 1}`;
  }

  try {
    const res = await fetch(`/api/memories/${memoryId}/like`, {
      method: "POST",
    });
    if (res.status === 401) {
      if (typeof showToast === "function")
        showToast("Accedi per mettere like!", "error");

      if (wasLiked) {
        icon.classList.add("fas");
        icon.classList.remove("far");
        icon.style.color = "#ef4444";
        if (countSpan)
          countSpan.textContent = el.classList.contains("action-btn")
            ? currentCount
            : ` ${currentCount}`;
      } else {
        icon.classList.add("far");
        icon.classList.remove("fas");
        icon.style.color = el.classList.contains("action-btn")
          ? "white"
          : "#cbd5e1";
        if (countSpan)
          countSpan.textContent = el.classList.contains("action-btn")
            ? currentCount
            : ` ${currentCount}`;
      }
      return;
    }
  } catch (err) {
    console.error(err);
  }
};

window.shareMemory = async function (id, authorName, title, el) {
  const link = `${window.location.origin}/profile/${encodeURIComponent(authorName)}?memory=${id}`;

  try {
    const res = await fetch(`/api/memories/${id}/share`, { method: "POST" });
    const data = await res.json();
    if (el) {
      const countSpan =
        el.querySelector(".share-count") || el.querySelector("span");
      if (countSpan) {
        if (el.classList.contains("action-btn")) {
          countSpan.textContent = data.shares;
        } else {
          countSpan.textContent = ` ${data.shares}`;
        }
      }
    }
  } catch (e) {}

  if (navigator.share) {
    try {
      await navigator.share({
        title: title || "Astral Cup Memory",
        text: `Guarda questa memory di ${authorName}!`,
        url: link,
      });
      return;
    } catch (err) {}
  }

  navigator.clipboard.writeText(link).then(() => {
    if (typeof showToast === "function") showToast("Link copiato!", "success");
  });
};

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
        buttonLabel = "Visualizza Iscrizioni";
        buttonAction = "view_subscription";
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
          } else if (action === "view_subscription") {
            openSubscriptionModal(tid);
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
    <style>
      .modal-custom { background: #181a20; padding: 2rem; border-radius: 16px; width: 90%; max-width: 400px; position: relative; }
      @media (max-width: 480px) { .modal-custom { padding: 1.5rem; width: 95%; } }
    </style>
    <div class="modal-custom">
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
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };

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

async function openSubscriptionModal(tid) {
  try {
    const [resT, resU] = await Promise.all([
      fetch("/api/tournaments"),
      fetch("/api/me").catch(() => ({ ok: false }))
    ]);
    const tournaments = await resT.json();
    const tournament = tournaments.find(t => t._id === tid);
    let user = null;
    if (resU.ok) user = await resU.json();

    if (!tournament) return;

    const isTeamFormat = tournament.format === "duo" || tournament.format === "trio";
    let contentHtml = "";

    if (isTeamFormat) {
      const teams = tournament.teams || [];
      if (teams.length === 0) {
        contentHtml = "<p style='text-align: center; color: #94a3b8; padding: 1rem;'>Nessun team iscritto.</p>";
      } else {
        contentHtml = `<div style="display: flex; flex-direction: column; gap: 10px;">`;
        teams.forEach((team, idx) => {
          const captain = team.captain || { username: "Utente Eliminato", discordId: "0", avatar: null };
          let capName = captain.minecraftUsername || captain.username;
          let avatarUrl = `https://minotar.net/helm/${capName}/64.png`;
          
          let isMyTeam = user && captain.discordId === user.discordId;
          
          let membersHtml = "";
          if (team.teammates && team.teammates.length > 0) {
            membersHtml = team.teammates.map(mate => `
              <div style="display: flex; align-items: center; gap: 10px; padding: 4px 0; color: #cbd5e1; font-size: 0.9rem; justify-content: space-between;">
                 <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="https://minotar.net/helm/${mate.username || mate}/24.png" style="width: 20px; height: 20px; border-radius: 4px;"> 
                    ${mate.username || mate}
                 </div>
                 ${typeof mate === 'object' ? 
                    (mate.status === 'accepted' ? '<i class="fas fa-check-circle" style="color: #4ade80;" title="Accettato"></i>' : 
                     mate.status === 'rejected' ? '<i class="fas fa-times-circle" style="color: #f87171;" title="Rifiutato"></i>' : 
                     '<i class="fas fa-hourglass-half" style="color: #fbbf24;" title="In attesa"></i>') 
                    : ''}
              </div>
            `).join("");
          }

          contentHtml += `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid ${isMyTeam ? 'var(--primary-2)' : 'rgba(255,255,255,0.1)'}; border-radius: 8px; padding: 12px;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                      <span style="background: var(--primary-2); color: #000; font-weight: bold; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px;">#${idx + 1}</span>
                      <img src="${avatarUrl}" style="width: 24px; height: 24px; border-radius: 4px;">
                      <span style="font-weight: 600; color: #fff;">${capName}</span>
                  </div>
                  ${isMyTeam ? `<button onclick="unsubscribeTournament('${tid}').then(ok => { if(ok) { document.querySelector('.modal-overlay.subs-modal').remove(); loadTournaments(); } })" class="btn-icon delete" style="background: rgba(239, 68, 68, 0.2); color: #f87171; width: auto; padding: 4px 10px; font-size: 0.8rem; border-radius: 4px;">Disiscriviti</button>` : ''}
                </div>
                <div style="padding-left: 10px; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;">
                    ${membersHtml}
                </div>
            </div>
          `;
        });
        contentHtml += `</div>`;
      }
    } else {
      const subs = tournament.subscribers || [];
      if (subs.length === 0) {
        contentHtml = "<p style='text-align: center; color: #94a3b8; padding: 1rem;'>Nessun iscritto.</p>";
      } else {
        contentHtml = `<ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px;">`;
        subs.forEach(s => {
          let sName = s.minecraftUsername || s.username;
          let avatarUrl = `https://minotar.net/helm/${sName}/64.png`;
          let isMe = user && s.discordId === user.discordId;

          contentHtml += `
              <li style="display: flex; align-items: center; justify-content: space-between; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid ${isMe ? 'var(--primary-2)' : 'rgba(255,255,255,0.1)'};">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="${avatarUrl}" style="width: 30px; height: 30px; border-radius: 4px;">
                    <span style="font-weight: 600; color: var(--light);">${sName}</span>
                  </div>
                  ${isMe ? `<button onclick="unsubscribeTournament('${tid}').then(ok => { if(ok) { document.querySelector('.modal-overlay.subs-modal').remove(); loadTournaments(); } })" class="btn-icon delete" style="background: rgba(239, 68, 68, 0.2); color: #f87171; width: auto; padding: 4px 10px; font-size: 0.8rem; border-radius: 4px;">Disiscriviti</button>` : ''}
              </li>
          `;
        });
        contentHtml += `</ul>`;
      }
    }

    const modalHTML = `
      <div class="modal-overlay subs-modal active" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;">
          <div style="background: #0f172a; padding: 2rem; border-radius: 20px; width: 90%; max-width: 500px; position: relative; border: 1px solid var(--primary-2); box-shadow: 0 0 30px rgba(59, 130, 246, 0.3); max-height: 80vh; display: flex; flex-direction: column;">
              <button onclick="this.closest('.modal-overlay').remove()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: #fff; font-size: 1.5rem; cursor: pointer;">&times;</button>
              <h2 style="color: var(--primary-2); margin-bottom: 0.5rem; text-align: center;">Iscritti: ${tournament.title}</h2>
              <div style="overflow-y: auto; padding-right: 5px; margin-top: 1rem;">${contentHtml}</div>
          </div>
      </div>`;
    
    document.body.insertAdjacentHTML("beforeend", modalHTML);
  } catch (e) { console.error(e); }
}

function unsubscribeTournament(id) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirm-modal";
    overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 20000;";

    overlay.innerHTML = `
      <style>
        .modal-confirm-box { background: #181a20; padding: 2rem; border-radius: 16px; width: 90%; max-width: 400px; text-align: center; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 25px rgba(0,0,0,0.5); animation: fadeIn 0.2s ease; }
        .btn-confirm-action { padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; transition: 0.2s; }
        .btn-confirm-yes { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
        .btn-confirm-yes:hover { background: rgba(239, 68, 68, 0.3); }
        .btn-confirm-no { background: rgba(255, 255, 255, 0.05); color: #e2e8f0; border: 1px solid rgba(255, 255, 255, 0.1); }
        .btn-confirm-no:hover { background: rgba(255, 255, 255, 0.1); }
      </style>
      <div class="modal-confirm-box">
          <h3 style="color: #fff; margin-bottom: 1rem; font-size: 1.3rem;">Conferma Disiscrizione</h3>
          <p style="color: #94a3b8; margin-bottom: 1.5rem; line-height: 1.5;">Sei sicuro di voler annullare l'iscrizione? Questa azione è irreversibile.</p>
          <div style="display: flex; gap: 12px; justify-content: center;">
              <button id="btn-cancel-unsub" class="btn-confirm-action btn-confirm-no">Annulla</button>
              <button id="btn-confirm-unsub" class="btn-confirm-action btn-confirm-yes">Disiscriviti</button>
          </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = (val) => {
      overlay.remove();
      resolve(val);
    };

    overlay.querySelector("#btn-cancel-unsub").onclick = () => close(false);
    overlay.onclick = (e) => { if (e.target === overlay) close(false); };

    overlay.querySelector("#btn-confirm-unsub").onclick = async () => {
      overlay.remove();
      try {
        const res = await fetch(`/api/tournaments/${id}/unsubscribe`, {
          method: "POST",
          credentials: "include",
        });
        if (res.status === 401) {
          showToast("Devi effettuare il login per disiscriverti!", "error");
          resolve(false);
          return;
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          showToast(`Errore Server: ${res.status} (Riavvia il backend)`, "error");
          resolve(false);
          return;
        }
        const data = await res.json();
        if (data && data.message) showToast(data.message, "success");
        resolve(true);
      } catch (err) {
        showToast("Errore durante la disiscrizione", "error");
        resolve(false);
      }
    };
  });
}

async function loadMemories() {
  try {
    const res = await fetch("/api/memories");
    const memories = await res.json();

    let currentUser = null;
    try {
      const meRes = await fetch("/api/me");
      if (meRes.ok) currentUser = await meRes.json();
    } catch (e) {}

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
      const likesCount = m.likes ? m.likes.length : 0;
      const sharesCount = m.shares || 0;
      const isLiked =
        currentUser && m.likes && m.likes.includes(currentUser.discordId);

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
        /\.(jpg|jpeg|png|webp|gif|bmp)(\?.*)?$/i.test(m.videoUrl)
      ) {
        media = `<img src="${m.videoUrl}" alt="Memory" onclick="event.stopPropagation(); openMediaModal('${m.videoUrl}', 'image', '${m._id}', '${m.authorName || ""}', ${likesCount}, ${sharesCount}, ${isLiked})" style="width:100%;height:180px;object-fit:cover;border-radius:10px; cursor: zoom-in;">`;
      } else if (m.videoUrl) {
        media = `<a href="${m.videoUrl}" target="_blank" onclick="event.stopPropagation()">${m.videoUrl}</a>`;
      }

      const date = m.createdAt
        ? new Date(m.createdAt).toLocaleDateString()
        : "";

      const authorHtml = m.authorName
        ? `<div onclick="event.stopPropagation(); window.location.href='/profile/${encodeURIComponent(m.authorName)}'" style="margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--primary-2); font-weight: 600; cursor: pointer; display: inline-block;"><i class="fas fa-user" style="margin-right: 5px;"></i> ${m.authorName}</div>`
        : "";

      const heartClass = isLiked ? "fas" : "far";
      const heartColor = isLiked ? "#ef4444" : "#cbd5e1";

      const card = `
        <div class="card memory-card" onclick="window.location.href='/profile/${encodeURIComponent(m.authorName)}?memory=${m._id}'" style="min-height:320px;display:flex;flex-direction:column;justify-content:space-between; cursor: pointer;">
          <div>
            ${media}
            <h3 style="margin:0.7rem 0 0.3rem 0;">${m.title || "Memory"}</h3>
            ${authorHtml}
            <p style="font-size:0.98em;color:#aaa;margin-bottom:0.5rem;">${date}</p>
            <p style="margin-bottom:0.7rem;">${m.description ? m.description : ""}</p>
          </div>
          <div style="display: flex; gap: 15px; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
            <button onclick="event.stopPropagation(); toggleLike(this, '${m._id}')" class="btn-icon" style="width: auto; padding: 5px 10px; gap: 6px; background: transparent; color: #cbd5e1; font-size: 0.9rem;">
                <i class="${heartClass} fa-heart" style="font-size: 1.1rem; color: ${heartColor};"></i> <span>${likesCount}</span>
            </button>
            <button onclick="event.stopPropagation(); shareMemory('${m._id}', '${m.authorName || ""}', '${m.title || "Memory"}', this)" class="btn-icon" style="width: auto; padding: 5px 10px; gap: 6px; background: transparent; color: #cbd5e1; font-size: 0.9rem;">
                <i class="fas fa-share" style="font-size: 1.1rem;"></i> <span>${sharesCount}</span>
            </button>
          </div>
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

  overlay.innerHTML = `
    <style>
      .modal-custom { background: #181a20; padding: 2rem; border-radius: 16px; width: 90%; max-width: 420px; position: relative; box-shadow: 0 8px 32px rgba(0,0,0,0.25); }
      @media (max-width: 480px) { .modal-custom { padding: 1.5rem; width: 95%; } }
    </style>
    <div class="modal-custom">
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
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector(".modal-close").onclick = () => overlay.remove();
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };

  const form = overlay.querySelector("#add-memory-form");
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
