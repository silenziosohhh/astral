function getTournamentId() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("tid")) return urlParams.get("tid");
  const match = window.location.pathname.match(/torneo\/(\w+)/);
  return match ? match[1] : null;
}

async function loadTournament() {
  const id = getTournamentId();
  if (!id) return;

  const [resT, resU] = await Promise.all([
    fetch(`/api/tournaments`),
    fetch(`/api/me`).catch(() => ({ ok: false })),
  ]);

  const tournaments = await resT.json();
  const t = tournaments.find((t) => t._id === id);
  let user = null;
  if (resU.ok) user = await resU.json();

  if (!t) {
    document.getElementById("tournament-details").innerHTML =
      "<h2>Torneo non trovato</h2>";
    return;
  }
  document.title = `${t.title} | Astral Cup`;

  const dateObj = new Date(t.date);
  const dateStr = dateObj.toLocaleDateString("it-IT", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = dateObj.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusClass =
    t.status === "Aperto"
      ? "status-open"
      : t.status === "In Corso"
        ? "status-live"
        : "status-closed";
  const statusLabel = t.status;

  const isSubscribed =
    user && t.subscribers.some((s) => s.discordId === user.discordId);
  let actionBtn = "";

  if (!user) {
    actionBtn = `<button class="btn-discord" onclick="window.location.href='/auth/discord'" style="width: 100%; justify-content: center; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;"><i class="fab fa-discord"></i> Accedi per Iscriverti</button>`;
  } else if (isSubscribed) {
    actionBtn = `<button id="btn-view-sub" class="btn-visit" style="width: 100%; justify-content: center; margin-bottom: 12px;">Visualizza Iscrizioni</button>`;
  } else if (t.status === "Aperto") {
    if (t.format === "solo") {
      actionBtn = `<button id="btn-subscribe" class="btn-visit" style="width: 100%; justify-content: center; margin-bottom: 12px;">Iscriviti Ora</button>`;
    } else {
      actionBtn = `<button id="btn-subscribe-team" class="btn-visit" style="width: 100%; justify-content: center; margin-bottom: 12px;">Iscriviti (Team)</button>`;
    }
  } else {
    actionBtn = `<button disabled style="width: 100%; padding: 0.8rem; border-radius: 8px; font-weight: 600; margin-bottom: 12px; background: #334155; color: #94a3b8; border: none; cursor: not-allowed;">Iscrizioni Chiuse</button>`;
  }

  let subsHtml = "";
  const isTeamFormat = t.format === "duo" || t.format === "trio";

  if (isTeamFormat && t.teams && t.teams.length > 0) {
    subsHtml = `
      <div style="margin-top: 3rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 2rem;">
          <h3 style="color: #fff; margin-bottom: 1.5rem; font-size: 1.4rem;">Teams Partecipanti <span style="font-size: 1rem; color: #94a3b8; font-weight: normal;">(${t.teams.length})</span></h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 15px;">
              ${t.teams.map(team => {
                  const captain = team.captain || { username: "Unknown" };
                  const capName = captain.minecraftUsername || captain.username;
                  const capAvatar = `https://minotar.net/helm/${capName}/64.png`;
                  
                  let membersHtml = "";
                  if (team.teammates && team.teammates.length > 0) {
                      membersHtml = team.teammates.map(mate => {
                          const mName = mate.username || mate;
                          return `
                              <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 0.9rem; color: #cbd5e1; padding-left: 42px;">
                                  <img src="https://minotar.net/helm/${mName}/24.png" style="width: 20px; height: 20px; border-radius: 4px;">
                                  <span>${mName}</span>
                              </div>
                          `;
                      }).join("");
                  }

                  return `
                      <div style="background: #0f172a; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                          <div style="display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; margin-bottom: 5px;">
                              <img src="${capAvatar}" style="width: 32px; height: 32px; border-radius: 4px;">
                              <div style="font-weight: 600; color: #fff;">${capName} <span style="font-size: 0.7rem; color: var(--primary-2); border: 1px solid var(--primary-2); padding: 1px 4px; border-radius: 3px; margin-left: 5px;">CAP</span></div>
                          </div>
                          ${membersHtml}
                      </div>
                  `;
              }).join("")}
          </div>
      </div>`;
  } else if (!isTeamFormat && t.subscribers && t.subscribers.length > 0) {
    subsHtml = `
      <div style="margin-top: 3rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 2rem;">
          <h3 style="color: #fff; margin-bottom: 1.5rem; font-size: 1.4rem;">Partecipanti <span style="font-size: 1rem; color: #94a3b8; font-weight: normal;">(${t.subscribers.length})</span></h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px;">
              ${t.subscribers.map(s => {
                  const sName = s.minecraftUsername || s.username;
                  const avatar = `https://minotar.net/helm/${sName}/64.png`;
                  return `<div style="background: #0f172a; padding: 12px; border-radius: 12px; display: flex; align-items: center; gap: 10px; border: 1px solid rgba(255,255,255,0.05);">
                          <img src="${avatar}" style="width: 32px; height: 32px; border-radius: 4px;">
                          <div style="font-size: 0.9rem; color: #e2e8f0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;">${sName}</div>
                      </div>`;
              }).join("")}
          </div>
      </div>`;
  }

  document.getElementById("tournament-details").innerHTML = `
    <style>
        .t-grid { display: grid; grid-template-columns: 1fr 350px; gap: 2rem; align-items: start; }
        @media (max-width: 900px) { .t-grid { grid-template-columns: 1fr; } }
        .t-card { background: #1e293b; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; }
        .t-info-row { display: flex; justify-content: space-between; padding: 1rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .t-info-row:last-child { border-bottom: none; }
        .t-info-label { color: #94a3b8; display: flex; align-items: center; gap: 10px; }
        .t-info-val { font-weight: 600; color: #fff; text-align: right; }
        .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
        .status-open { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .status-live { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
        .status-closed { background: rgba(148, 163, 184, 0.2); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3); }
        .btn-back { display: block; text-align: center; padding: 0.8rem; background: rgba(255,255,255,0.05); border-radius: 8px; color: #94a3b8; text-decoration: none; transition: 0.2s; font-weight: 500; }
        .btn-back:hover { background: rgba(255,255,255,0.1); color: #fff; }
    </style>

    <div class="t-grid">
        <div class="main-col">
            <div class="t-card" style="margin-bottom: 2rem;">
                <div style="height: 300px; width: 100%; overflow: hidden;">
                    <img src="${t.image || "../images/astralcup-logo.png"}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div style="padding: 2rem;">
                    <h1 style="font-size: 2.2rem; margin-bottom: 1rem; color: #fff; line-height: 1.2;">${t.title}</h1>
                    <div style="color: #cbd5e1; line-height: 1.8; font-size: 1.05rem;">
                        ${t.description ? t.description.replace(/\n/g, "<br>") : "<p>Nessuna descrizione fornita per questo torneo.</p>"}
                    </div>
                    ${subsHtml}
                </div>
            </div>
        </div>

        <div class="sidebar-col">
            <div class="t-card" style="padding: 1.5rem; position: sticky; top: 100px;">
                <div style="margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between;">
                    <h3 style="margin: 0; color: var(--primary-2);">Info Evento</h3>
                    <span class="status-badge ${statusClass}">${statusLabel}</span>
                </div>

                <div class="t-info-row">
                    <span class="t-info-label"><i class="far fa-calendar-alt"></i> Data</span>
                    <span class="t-info-val" style="text-transform: capitalize;">${dateStr}</span>
                </div>
                <div class="t-info-row">
                    <span class="t-info-label"><i class="far fa-clock"></i> Ora</span>
                    <span class="t-info-val">${timeStr}</span>
                </div>
                <div class="t-info-row">
                    <span class="t-info-label"><i class="fas fa-trophy"></i> Montepremi</span>
                    <span class="t-info-val" style="color: #fbbf24;">${t.prize || "N/A"}</span>
                </div>
                <div class="t-info-row">
                    <span class="t-info-label"><i class="fas fa-gamepad"></i> Formato</span>
                    <span class="t-info-val" style="text-transform: uppercase;">${t.format || "SOLO"}</span>
                </div>
                <div class="t-info-row">
                    <span class="t-info-label"><i class="fas fa-users"></i> Iscritti</span>
                    <span class="t-info-val">${t.subscribers.length}</span>
                </div>

                <div style="margin-top: 2rem; display: flex; flex-direction: column; gap: 12px;">
                    ${actionBtn}
                    <button class="btn-visit" id="copy-tournament-link" style="width: 100%; justify-content: center; font-size: 1rem;">
                        <i class="fas fa-share-alt" style="margin-right: 8px;"></i> Condividi
                    </button>
                    <a href="/" class="btn-back">
                        <i class="fas fa-arrow-left" style="margin-right: 6px;"></i> Torna alla Home
                    </a>
                </div>
            </div>
        </div>
    </div>
  `;
  document.getElementById("copy-tournament-link").onclick = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      if (typeof showToast === "function")
        showToast("Link copiato!", "success");
    });
  };

  const subBtn = document.getElementById("btn-subscribe");
  if (subBtn) {
    subBtn.onclick = async () => {
      subBtn.disabled = true;
      subBtn.innerText = "Elaborazione...";
      try {
        const res = await fetch(`/api/tournaments/${t._id}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teammates: [] }),
        });
        if (res.ok) {
          showToast("Iscrizione completata!", "success");
          loadTournament();
        } else {
          const d = await res.json();
          showToast(d.message || "Errore", "error");
          subBtn.disabled = false;
          subBtn.innerText = "Iscriviti Ora";
        }
      } catch (e) {
        showToast("Errore di connessione", "error");
        subBtn.disabled = false;
      }
    };
  }

  const subTeamBtn = document.getElementById("btn-subscribe-team");
  if (subTeamBtn) {
    subTeamBtn.onclick = () => {
      showJoinTeamModal(t._id, t.format);
    };
  }

  const viewSubBtn = document.getElementById("btn-view-sub");
  if (viewSubBtn) {
    viewSubBtn.onclick = () => openSubscriptionModal(t._id);
  }
}

window.addEventListener("DOMContentLoaded", loadTournament);

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
        <button type="submit" class="btn-visit btn-primary" style="width:100%; margin-top: 1rem;">Conferma Iscrizione</button>
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

    try {
      const res = await fetch(`/api/tournaments/${tid}/join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teammates }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Iscrizione completata!", "success");
        loadTournament();
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
    const existing = document.querySelector('.modal-overlay.subs-modal');
    if (existing) existing.remove();

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
                  ${isMyTeam ? `<button onclick="unsubscribeTournamentCustom('${tid}')" class="btn-icon delete" style="background: rgba(239, 68, 68, 0.2); color: #f87171; width: auto; padding: 4px 10px; font-size: 0.8rem; border-radius: 4px;">Disiscriviti</button>` : ''}
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
                  ${isMe ? `<button onclick="unsubscribeTournamentCustom('${tid}')" class="btn-icon delete" style="background: rgba(239, 68, 68, 0.2); color: #f87171; width: auto; padding: 4px 10px; font-size: 0.8rem; border-radius: 4px;">Disiscriviti</button>` : ''}
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

function unsubscribeTournamentCustom(id) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay confirm-modal";
  overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10001;";

  overlay.innerHTML = `
    <style>
      .modal-confirm-box { background: #181a20; padding: 2rem; border-radius: 16px; width: 90%; max-width: 400px; text-align: center; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
      .btn-confirm-action { padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; transition: 0.2s; }
      .btn-confirm-yes { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
      .btn-confirm-yes:hover { background: rgba(239, 68, 68, 0.3); }
      .btn-confirm-no { background: rgba(255, 255, 255, 0.05); color: #e2e8f0; border: 1px solid rgba(255, 255, 255, 0.1); }
      .btn-confirm-no:hover { background: rgba(255, 255, 255, 0.1); }
    </style>
    <div class="modal-confirm-box">
        <h3 style="color: #fff; margin-bottom: 1rem; font-size: 1.3rem;">Conferma Disiscrizione</h3>
        <p style="color: #94a3b8; margin-bottom: 1.5rem; line-height: 1.5;">Sei sicuro di voler annullare l'iscrizione a questo torneo? Questa azione è irreversibile.</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="btn-cancel-unsub" class="btn-confirm-action btn-confirm-no">Annulla</button>
            <button id="btn-confirm-unsub" class="btn-confirm-action btn-confirm-yes">Disiscriviti</button>
        </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById("btn-cancel-unsub").onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  document.getElementById("btn-confirm-unsub").onclick = async () => {
    close();
    try {
      const res = await fetch(`/api/tournaments/${id}/unsubscribe`, { method: "POST", credentials: "include" });
      if (res.status === 401) return showToast("Devi effettuare il login per disiscriverti!", "error");
      
      const data = await res.json();
      if (data && data.message) showToast(data.message, "success");
      
      const subsModal = document.querySelector('.modal-overlay.subs-modal');
      if (subsModal) subsModal.remove();
      
      loadTournament();
    } catch (err) {
      showToast("Errore durante la disiscrizione", "error");
    }
  };
}
