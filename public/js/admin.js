document.addEventListener("DOMContentLoaded", () => {
  loadAdminTournaments();

  const tournamentForm = document.querySelector(".admin-form");
  if (tournamentForm) {
    tournamentForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const inputs = tournamentForm.querySelectorAll("input, textarea");
      const formatSelect = document.getElementById("tournament-format");
      const data = {
        title: inputs[0].value,
        date: inputs[1].value,
        prize: inputs[2].value,
        image: inputs[3].value,
        description: inputs[4].value,
        format: formatSelect ? formatSelect.value : "solo",
      };

      try {
        const res = await fetch("/api/tournaments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (res.ok) {
          showToast("Torneo creato con successo!", "success");
          tournamentForm.reset();
          loadAdminTournaments();
        } else {
          showToast("Errore nella creazione del torneo", "error");
        }
      } catch (err) {
        console.error(err);
        showToast("Errore di connessione", "error");
      }
    });
  }

  const saveButtons = document.querySelectorAll(".btn-icon.save");
  saveButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const row = e.target.closest("tr");
      const inputs = row.querySelectorAll("input");
      const username = inputs[0].value;
      const data = {
        wins: inputs[1].value,
        kills: inputs[2].value,
        bedBroken: inputs[3].value,
        points: row.querySelector("strong").innerText,
      };

      showToast(
        `Funzionalità aggiornamento per ${username} in arrivo!`,
        "info",
      );
    });
  });
});

let adminTournamentsData = [];

async function loadAdminTournaments() {
  const tbody = document.querySelector("#admin-tournaments-body");
  if (!tbody) return;

  try {
    const res = await fetch("/api/tournaments");
    const tournaments = await res.json();
    console.log("Tornei caricati:", tournaments);
    if (tournaments.length > 0) {
      tournaments.forEach((t) => {
        console.log(`Iscritti torneo '${t.title}':`, t.subscribers);
      });
    }
    adminTournamentsData = tournaments;

    tbody.innerHTML = "";
    tournaments.forEach((t) => {
      const link = `${window.location.origin}/torneo/${t._id}`;
      const formatLabel = t.format ? t.format.toUpperCase() : "SOLO";
      const row = `
        <tr>
          <td style="cursor: pointer; color: var(--primary-2); font-weight: bold;" onclick="showSubscribers('${t._id}')" title="Clicca per vedere gli iscritti">
            ${t.title} <i class='fas fa-users' style='font-size: 0.8rem; margin-left: 8px; opacity: 0.7;'></i>
          </td>
          <td>${new Date(t.date).toLocaleDateString()} <span style="font-size: 0.8em; background: #334155; padding: 2px 6px; border-radius: 4px;">${formatLabel}</span></td>
          <td>${t.prize}</td>
          <td style="display: flex; gap: 6px;">
            <button class="btn-icon edit" title="Modifica"><i class="fas fa-edit"></i></button>
            <button class="btn-icon delete" title="Elimina" data-id="${t._id}"><i class="fas fa-trash"></i></button>
            <button class="btn-icon copy-link" title="Copia link" data-link="${link}"><i class="fas fa-link"></i></button>
          </td>
        </tr>
      `;
      tbody.innerHTML += row;
    });

    tbody.querySelectorAll(".btn-icon.delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        showDeleteTournamentModal(id);
      });
    });

    function showDeleteTournamentModal(tournamentId) {
      document
        .querySelectorAll(".modal-overlay.delete-modal")
        .forEach((m) => m.remove());
      const modalHTML = `
    <style>
      .modal-custom { background: #1e293b; padding: 2rem; border-radius: 16px; width: 90%; max-width: 400px; position: relative; border: 1px solid rgba(255,255,255,0.1); }
      @media (max-width: 480px) { .modal-custom { padding: 1.5rem; width: 95%; } }
    </style>
    <div class="modal-overlay delete-modal active">
      <div class="modal-custom" style="text-align: center;">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        <h2 style="color: var(--primary-2); margin-bottom: 1.2rem;">Conferma eliminazione</h2>
        <p style="color: #cbd5e1; margin-bottom: 2rem;">Sei sicuro di voler eliminare questo torneo? Questa azione è <b>irreversibile</b>.</p>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button class="btn-cta" id="confirm-delete-tournament" style="background: #ef4444; border: none;">Elimina</button>
          <button class="btn-cta" style="background: #64748b; border: none;" onclick="this.closest('.modal-overlay').remove()">Annulla</button>
        </div>
      </div>
    </div>
  `;
      document.body.insertAdjacentHTML("beforeend", modalHTML);
      const overlay = document.querySelector(".modal-overlay.delete-modal");
      if (overlay) {
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) overlay.remove();
        });
      }
      document.getElementById("confirm-delete-tournament").onclick =
        async () => {
          try {
            const res = await fetch(`/api/tournaments/${tournamentId}`, {
              method: "DELETE",
            });
            if (res.ok) {
              showToast("Torneo eliminato!", "success");
              loadAdminTournaments();
            } else {
              showToast("Errore durante l'eliminazione", "error");
            }
          } catch (err) {
            showToast("Errore di connessione", "error");
          }
          document
            .querySelectorAll(".modal-overlay.delete-modal")
            .forEach((m) => m.remove());
        };
    }

    tbody.querySelectorAll(".btn-icon.copy-link").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const link = btn.getAttribute("data-link");
        navigator.clipboard.writeText(link).then(() => {
          showToast("Link copiato negli appunti!", "success");
        });
      });
    });
  } catch (err) {
    console.error(err);
    showToast("Errore caricamento tornei", "error");
  }
}

window.showSubscribers = function (id) {
  const tournament = adminTournamentsData.find((t) => t._id === id);
  if (!tournament) return;

  const isTeamFormat =
    tournament.format === "duo" || tournament.format === "trio";
  let contentHtml = "";
  let countText = "";

  if (isTeamFormat) {
    const teams = tournament.teams || [];
    countText = `Totale Teams: ${teams.length}`;

    if (teams.length === 0) {
      contentHtml =
        "<p style='text-align: center; color: #94a3b8; padding: 1rem;'>Nessun team iscritto al momento.</p>";
    } else {
      contentHtml = `<div style="display: flex; flex-direction: column; gap: 10px;">`;
      teams.forEach((team, idx) => {
        const captain = team.captain || {
          username: "Utente Eliminato",
          discordId: "0",
          avatar: null,
        };
        let avatarUrl = "https://cdn.discordapp.com/embed/avatars/0.png";
        if (captain.avatar) {
          avatarUrl = `https://cdn.discordapp.com/avatars/${captain.discordId}/${captain.avatar}.png`;
        }

        let membersHtml = "";
        if (team.teammates && team.teammates.length > 0) {
          membersHtml = team.teammates
            .map(
              (mate) => `
                <div style="display: flex; align-items: center; gap: 10px; padding: 4px 0; color: #cbd5e1; font-size: 0.9rem;">
                   <i class="fas fa-user-tag" style="width: 20px; text-align: center; opacity: 0.7;"></i>
                   ${mate}
                </div>
             `,
            )
            .join("");
        }

        contentHtml += `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: ${membersHtml ? "8px" : "0"}; border-bottom: ${membersHtml ? "1px solid rgba(255,255,255,0.05)" : "none"}; padding-bottom: ${membersHtml ? "8px" : "0"};">
                    <span style="background: var(--primary-2); color: #000; font-weight: bold; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px;">#${idx + 1}</span>
                    <img src="${avatarUrl}" style="width: 24px; height: 24px; border-radius: 50%;">
                    <span style="font-weight: 600; color: #fff;">${captain.username}</span>
                    <span style="font-size: 0.75rem; color: var(--primary-2); border: 1px solid var(--primary-2); padding: 1px 4px; border-radius: 3px;">CAPTAIN</span>
                </div>
                <div style="padding-left: 10px;">
                    ${membersHtml}
                </div>
            </div>
          `;
      });
      contentHtml += `</div>`;
    }
  } else {
    const subs = tournament.subscribers || [];
    countText = `Totale Iscritti: ${subs.length}`;

    if (subs.length === 0) {
      contentHtml =
        "<p style='text-align: center; color: #94a3b8; padding: 1rem;'>Nessun iscritto al momento.</p>";
    } else {
      contentHtml = `<ul style="list-style: none; padding: 0;">`;
      subs.forEach((s) => {
        let avatarUrl = "https://cdn.discordapp.com/embed/avatars/0.png";
        if (s.avatar)
          avatarUrl = `https://cdn.discordapp.com/avatars/${s.discordId}/${s.avatar}.png`;

        contentHtml += `
                <li style="display: flex; align-items: center; gap: 15px; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <img src="${avatarUrl}" style="width: 35px; height: 35px; border-radius: 50%; border: 1px solid var(--primary-2);">
                    <span style="font-weight: 600; color: var(--light);">${s.username}</span>
                </li>
            `;
      });
      contentHtml += `</ul>`;
    }
  }

  const modalHTML = `
    <style>
      .modal-custom { background: #0f172a; padding: 2rem; border-radius: 20px; width: 90%; max-width: 500px; position: relative; border: 1px solid var(--primary-2); box-shadow: 0 0 30px rgba(59, 130, 246, 0.3); }
      @media (max-width: 480px) { .modal-custom { padding: 1.5rem; width: 95%; } }
    </style>
    <div class="modal-overlay active">
        <div class="modal-custom">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            <h2 style="color: var(--primary-2); margin-bottom: 0.5rem; text-align: center;">Iscritti: ${tournament.title}</h2>
            <p style="text-align: center; color: #64748b; margin-bottom: 1.5rem; font-size: 0.9rem;">Formato: ${tournament.format ? tournament.format.toUpperCase() : "SOLO"}</p>
            <div style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
                ${contentHtml}
            </div>
            <div style="text-align: center; margin-top: 1rem; color: #64748b; font-size: 0.9rem;">${countText}</div>
        </div>
    </div>
    `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);
  const overlays = document.querySelectorAll(".modal-overlay.active");
  const overlay = overlays[overlays.length - 1];
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }
};
