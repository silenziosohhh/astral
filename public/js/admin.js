document.addEventListener("DOMContentLoaded", () => {
  loadAdminTournaments();

  const tournamentForm = document.querySelector(".admin-form");
  if (tournamentForm) {
    tournamentForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const inputs = tournamentForm.querySelectorAll("input, textarea");
      const data = {
        title: inputs[0].value,
        date: inputs[1].value,
        prize: inputs[2].value,
        image: inputs[3].value,
        description: inputs[4].value,
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
    adminTournamentsData = tournaments;

    tbody.innerHTML = "";
    tournaments.forEach((t) => {
      const row = `
                <tr>
                    <td style="cursor: pointer; color: var(--primary-2); font-weight: bold;" onclick="showSubscribers('${t._id}')" title="Clicca per vedere gli iscritti">
                        ${t.title} <i class="fas fa-users" style="font-size: 0.8rem; margin-left: 8px; opacity: 0.7;"></i>
                    </td>
                    <td>${new Date(t.date).toLocaleDateString()}</td>
                    <td>${t.prize}</td>
                    <td>
                        <button class="btn-icon edit"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
      tbody.innerHTML += row;
    });
  } catch (err) {
    console.error(err);
    showToast("Errore caricamento tornei", "error");
  }
}

window.showSubscribers = function (id) {
  const tournament = adminTournamentsData.find((t) => t._id === id);
  if (!tournament) return;

  const subs = tournament.subscribers || [];
  let subsHtml = "";

  if (subs.length === 0) {
    subsHtml =
      "<p style='text-align: center; color: #94a3b8; padding: 1rem;'>Nessun iscritto al momento.</p>";
  } else {
    subsHtml = `<ul style="list-style: none; padding: 0;">`;
    subs.forEach((s) => {
      let avatarUrl = "https://cdn.discordapp.com/embed/avatars/0.png";
      if (s.avatar) {
        avatarUrl = `https://cdn.discordapp.com/avatars/${s.discordId}/${s.avatar}.png`;
      }
      subsHtml += `
                <li style="display: flex; align-items: center; gap: 15px; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <img src="${avatarUrl}" style="width: 35px; height: 35px; border-radius: 50%; border: 1px solid var(--primary-2);">
                    <span style="font-weight: 600; color: var(--light);">${s.username}</span>
                </li>
            `;
    });
    subsHtml += `</ul>`;
  }

  const modalHTML = `
    <div class="modal-overlay active">
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            <h2 style="color: var(--primary-2); margin-bottom: 1.5rem; text-align: center;">Iscritti: ${tournament.title}</h2>
            <div style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
                ${subsHtml}
            </div>
            <div style="text-align: center; margin-top: 1rem; color: #64748b; font-size: 0.9rem;">Totale: ${subs.length}</div>
        </div>
    </div>
    `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);
};
