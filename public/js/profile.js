document.addEventListener("DOMContentLoaded", async () => {
  loadUserProfile();
  loadMyMemories();
});

async function loadUserProfile() {
  try {
    const res = await fetch("/me");
    if (!res.ok) {
      window.location.href = "/";
      return;
    }
    const user = await res.json();

    document.getElementById("profile-username").textContent = user.username;
    document.getElementById("profile-role").textContent =
      user.role.toUpperCase();

    let avatarUrl = "https://cdn.discordapp.com/embed/avatars/0.png";
    if (user.avatar) {
      avatarUrl = `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`;
    }
    document.getElementById("profile-avatar").src = avatarUrl;

    document.getElementById("stat-wins").textContent = user.wins || 0;
    document.getElementById("stat-kills").textContent = user.kills || 0;
    document.getElementById("stat-points").textContent = user.points || 0;
  } catch (err) {
    console.error("Errore caricamento profilo", err);
  }
}

async function loadMyMemories() {
  try {
    const res = await fetch("/api/my-memories");
    if (!res.ok) {
      console.error("Errore fetch memories:", res.status);
      return;
    }

    const memories = await res.json();
    const container = document.getElementById("my-memories-grid");

    if (!Array.isArray(memories) || memories.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-film"></i>
            <h3>Nessuna Memory</h3>
            <p>Non hai ancora caricato nessuna clip.</p>
        </div>`;
      return;
    }

    container.innerHTML = "";
    memories.forEach((m) => {
      const bgStyle = m.videoUrl
        ? `background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.8)), url('${m.videoUrl}') center/cover no-repeat;`
        : "";

      const card = `
        <div class="card memory-card" style="${bgStyle}">
            <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%;">
                <h3 style="text-shadow: 0 2px 4px rgba(0,0,0,0.8); color: #fff; margin: 0;">${m.title}</h3>
                ${m.description ? `<p style="font-size: 0.9rem; margin-top: 0.5rem; text-shadow: 0 2px 4px rgba(0,0,0,0.8); color: #e2e8f0; text-align: center;">${m.description}</p>` : ""}
            </div>
            <div style="margin-top: 1rem; display: flex; gap: 10px; z-index: 2;">
                <button onclick="deleteMemory('${m._id}')" class="btn-icon delete" title="Elimina"><i class="fas fa-trash"></i></button>
                <button onclick="window.open('${m.videoUrl}', '_blank')" class="btn-icon" title="Apri"><i class="fas fa-external-link-alt"></i></button>
            </div>
        </div>
      `;
      container.innerHTML += card;
    });
  } catch (err) {
    console.error("Errore caricamento memories", err);
  }
}

async function deleteMemory(id) {
  if (!confirm("Sei sicuro di voler eliminare questa memory?")) return;

  try {
    const res = await fetch(`/api/memories/${id}`, { method: "DELETE" });
    if (res.ok) {
      loadMyMemories();
    } else {
      showToast("Errore durante l'eliminazione", "error");
    }
  } catch (err) {
    console.error(err);
  }
}
