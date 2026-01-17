document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  if (
    path.includes("tornei.html") ||
    path === "/" ||
    path.includes("index.html")
  ) {
    loadTournaments();
  }

  if (
    path.includes("classifica.html") ||
    path === "/" ||
    path.includes("index.html")
  ) {
    loadLeaderboard();
  }

  if (
    path.includes("memories.html") ||
    path === "/" ||
    path.includes("index.html")
  ) {
    loadMemories();
  }

  if (
    path.includes("staff.html") ||
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

    const isHome = !window.location.pathname.includes("tornei.html");
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

      const buttonLabel = isSubscribed ? "Disiscriviti" : "Iscriviti Ora";
      const buttonAction = isSubscribed
        ? `unsubscribeTournament('${t._id}')`
        : `joinTournament('${t._id}')`;

      const card = `
                <div class="card" style="${bgStyle}">
                    <div class="card-icon"><i class="fas fa-gamepad"></i></div>
                    <h3 style="${textStyle}">${t.title}</h3>
                    <p style="margin: 0.5rem 0; ${textStyle}">Data: ${new Date(t.date).toLocaleDateString()} ${new Date(t.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    <p style="margin-bottom: 1.5rem; ${textStyle}">Montepremi: <strong>${t.prize}</strong></p>
                    <p style="margin-bottom: 1.5rem; ${textStyle}">Stato: <span class="status-${t.status === "Aperto" ? "open" : t.status === "In Corso" ? "live" : "closed"}">${t.status}</span></p>
                    <button onclick="${buttonAction}" class="btn-visit" style="cursor: pointer;">${buttonLabel}</button>
                </div>
            `;
      container.innerHTML += card;
    });
  } catch (err) {
    console.error("Errore caricamento tornei", err);
  }
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

    if (res.ok) {
      showToast("Disiscrizione completata!", "success");
      loadTournaments();
    } else {
      showToast(data.message || "Errore durante la disiscrizione", "error");
    }
  } catch (err) {
    showToast("Errore di connessione", "error");
  }
}

async function joinTournament(id) {
  try {
    const res = await fetch(`/api/tournaments/${id}/join`, {
      method: "POST",
      credentials: "include",
    });

    if (res.status === 401) {
      showToast("Devi effettuare il login per iscriverti!", "error");
      return;
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error(
        "Risposta non JSON dal server:",
        res.status,
        res.statusText,
      );
      showToast(`Errore Server: ${res.status} (Riavvia il backend)`, "error");
      return;
    }

    const data = await res.json();

    if (res.ok) {
      showToast("Iscrizione completata!", "success");
      loadTournaments();
    } else {
      showToast(data.message || "Errore durante l'iscrizione", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Errore di connessione", "error");
  }
}

async function loadLeaderboard() {
  try {
    const res = await fetch("/api/leaderboard");
    const users = await res.json();

    if (users.length === 0) {
      const tableBody = document.querySelector(".admin-table tbody");
      if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem;">Nessun giocatore in classifica</td></tr>`;
      }
      return;
    }

    const podiumContainer = document.querySelector("#classifica .grid-3");
    if (podiumContainer && users.length > 0) {
    }

    const tableBody = document.querySelector(".admin-table tbody");
    if (tableBody && window.location.pathname.includes("classifica.html")) {
      tableBody.innerHTML = "";
      users.forEach((user, index) => {
        if (index < 3) return;
        const row = `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${user.username}</td>
                        <td>${user.wins}</td>
                        <td>${user.kills}</td>
                        <td>${user.points}</td>
                    </tr>
                `;
        tableBody.innerHTML += row;
      });
    }
  } catch (err) {
    console.error("Errore caricamento classifica", err);
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
      container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-camera-retro"></i>
            <h3>Nessuna Memory Presente</h3>
            <p>Aggiungi ora i momenti più belli della Astral Cup!</p>
            <button onclick="openAddMemoryModal()" class="btn-primary" style="margin-top: 1rem;"><i class="fas fa-plus"></i> Aggiungi Memory</button>
        </div>`;
      return;
    }

    container.innerHTML = "";

    const isHome = !window.location.pathname.includes("memories.html");
    const itemsToShow = isHome ? memories.slice(0, 3) : memories;

    itemsToShow.forEach((m) => {
      const onClick = m.videoUrl
        ? `onclick="window.open('${m.videoUrl}', '_blank')"`
        : "";

      const bgStyle = m.videoUrl
        ? `background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.8)), url('${m.videoUrl}') center/cover no-repeat;`
        : "";

      const card = `
                <div class="card memory-card" style="cursor: pointer; ${bgStyle}" ${onClick}>
                  <div style="font-size: 3rem; color: var(--light); opacity: 0.9; text-shadow: 0 4px 10px rgba(0,0,0,0.5);">
                    <i class="fas fa-play-circle"></i>
                  </div>
                  <h3 style="margin-top: 1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.8); color: #fff;">${m.title}</h3>
                  ${m.description ? `<p style="font-size: 0.9rem; margin-top: 0.5rem; opacity: 0.9; text-shadow: 0 2px 4px rgba(0,0,0,0.8); color: #e2e8f0;">${m.description}</p>` : ""}
                </div>
            `;
      container.innerHTML += card;
    });
  } catch (err) {
    console.error("Errore caricamento memories", err);
  }
}

async function loadStaff() {
  try {
    const res = await fetch("/api/staff");
    const staffMembers = await res.json();

    const container =
      document.querySelector("#staff .grid-3") ||
      document.querySelector("#staff-grid");

    if (!container) return;

    container.innerHTML = "";

    staffMembers.forEach((member) => {
      let avatarUrl = "https://cdn.discordapp.com/embed/avatars/0.png";
      if (member.avatar) {
        avatarUrl = `https://cdn.discordapp.com/avatars/${member.discordId}/${member.avatar}.png`;
      }

      const card = `
        <div class="card">
            <div class="card-icon">
                <img src="${avatarUrl}" alt="${member.username}" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid ${member.roleColor}; object-fit: cover; margin-bottom: 10px;">
            </div>
            <h3>${member.username}</h3>
            <p style="margin: 0.5rem 0; color: white; background-color: ${member.roleColor}; padding: 0.25rem 0.5rem; border-radius: 4px; display: inline-block; font-size: 0.85rem; font-weight: bold">${member.role}</p>
            <p style="margin-bottom: 1.5rem">${member.description}</p>
            <p style="margin-bottom: 1.5rem">
                <a href="#"><i class="fab fa-youtube"></i></a>
                <a href="#"><i class="fab fa-discord"></i></a>
            </p>
        </div>
      `;
      container.innerHTML += card;
    });
  } catch (err) {
    console.error("Errore caricamento staff", err);
  }
}

function openAddMemoryModal() {
  const existingModal = document.querySelector(".modal-overlay");
  if (existingModal) existingModal.remove();

  const modalHTML = `
    <div class="modal-overlay active">
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            <h2 style="color: var(--primary-2); margin-bottom: 1.5rem; text-align: center;">Nuova Memory</h2>
            <form id="addMemoryForm" class="admin-form">
                <div class="form-group">
                    <label>Titolo</label>
                    <div class="input-group">
                        <i class="fas fa-heading"></i>
                        <input type="text" name="title" placeholder="Titolo della clip" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>URL Immagine/Video</label>
                    <div class="input-group">
                        <i class="fas fa-link"></i>
                        <input type="url" name="videoUrl" placeholder="https://..." required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Descrizione (max 200 car.)</label>
                    <div class="input-group">
                        <i class="fas fa-align-left" style="top: 20px; transform: none;"></i>
                        <textarea name="description" rows="3" maxlength="200" placeholder="Descrivi il momento..."></textarea>
                    </div>
                </div>
                <button type="submit" class="btn-cta" style="width: 100%; border: none; cursor: pointer;">Salva Memory</button>
            </form>
        </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  document
    .getElementById("addMemoryForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());

      if (data.description.length > 200) {
        showToast("La descrizione è troppo lunga!", "error");
        return;
      }

      const urlPattern = new RegExp(
        "^(https?:\\/\\/)?" +
          "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" +
          "((\\d{1,3}\\.){3}\\d{1,3}))" +
          "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" +
          "(\\?[;&a-z\\d%_.~+=-]*)?" +
          "(\\#[-a-z\\d_]*)?$",
        "i",
      );

      if (!urlPattern.test(data.videoUrl)) {
        showToast("Inserisci un URL valido!", "error");
        return;
      }

      try {
        const res = await fetch("/api/memories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (res.ok) {
          showToast("Memory aggiunta con successo!", "success");
          document.querySelector(".modal-overlay").remove();
          loadMemories();
        } else {
          const err = await res.json();
          showToast(
            "Errore: " + (err.message || "Impossibile salvare"),
            "error",
          );
        }
      } catch (error) {
        console.error(error);
        showToast("Errore di connessione", "error");
      }
    });
}
