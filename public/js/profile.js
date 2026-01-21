document.addEventListener("DOMContentLoaded", async () => {
  const pathParts = window.location.pathname.split("/");

  let profileUsername =
    pathParts.length > 2 && pathParts[2]
      ? decodeURIComponent(pathParts[2])
      : null;

  if (profileUsername === "profile.html") profileUsername = null;

  loadUserProfile(profileUsername);
  loadMemories(profileUsername);

  if (profileUsername) {
    document.body.classList.add("viewing-other-profile");
    const addMemoryBtn = document.getElementById("add-memory-btn");
    if (addMemoryBtn) addMemoryBtn.style.display = "none";
    return;
  }

  const addBtn = document.getElementById("add-memory-btn");
  if (addBtn) {
    addBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (typeof openAddMemoryModal === "function") openAddMemoryModal();
    });
  }

  const saveNickBtn = document.getElementById("save-mc-nick");
  if (saveNickBtn) {
    saveNickBtn.addEventListener("click", async () => {
      const nickInput = document.getElementById("minecraft-nick");
      const val = nickInput.value;
      try {
        const res = await fetch("/api/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minecraftUsername: val }),
        });
        const data = await res.json();
        if (res.ok) showToast("Nickname aggiornato!", "success");
        else showToast(data.message || "Errore", "error");
      } catch (err) {
        showToast("Errore di connessione", "error");
      }
    });
  }

  const editSkillsBtn = document.getElementById("edit-skills-btn");
  if (editSkillsBtn) {
    editSkillsBtn.addEventListener("click", openSkillsModal);
  }
});

async function loadUserProfile(username) {
  try {
    let url = "/api/me";
    if (username) url = `/api/users/${username}`;

    const res = await fetch(url);
    if (!res.ok) {
      if (username) {
        document.querySelector(".container").innerHTML =
          "<h2 style='text-align:center; margin-top: 50px;'>Utente non trovato</h2>";
      } else {
        window.location.href = "/";
      }
      return;
    }
    const user = await res.json();

    document.getElementById("profile-username").textContent = user.username;
    document.getElementById("profile-role").textContent =
      user.role.toUpperCase();

    const nickInput = document.getElementById("minecraft-nick");
    const saveNickBtn = document.getElementById("save-mc-nick");

    if (username) {
      if (nickInput) {
        const displaySpan = document.createElement("span");
        displaySpan.style.cssText =
          "color: #fff; font-size: 1.1rem; margin-left: 5px;";
        displaySpan.innerHTML = user.minecraftUsername
          ? `<i class="fas fa-cube" style="margin-right:5px; color:#22c55e;"></i> ${user.minecraftUsername}`
          : `<span style="color:#94a3b8; font-style:italic;">Nessun nickname MC</span>`;
        nickInput.parentNode.replaceChild(displaySpan, nickInput);
      }
      if (saveNickBtn) saveNickBtn.remove();
    } else {
      if (nickInput && user.minecraftUsername)
        nickInput.value = user.minecraftUsername;
    }

    let avatarUrl = "https://cdn.discordapp.com/embed/avatars/0.png";
    if (user.avatar) {
      avatarUrl = `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`;
    }
    document.getElementById("profile-avatar").src = avatarUrl;

    document.getElementById("stat-wins").textContent = user.wins || 0;
    document.getElementById("stat-kills").textContent = user.kills || 0;
    document.getElementById("stat-points").textContent = user.points || 0;

    const editSkillsBtn = document.getElementById("edit-skills-btn");
    if (username && editSkillsBtn) {
      editSkillsBtn.style.display = "none";
    }

    if (username)
      document.getElementById("memories-title").textContent =
        `Memories di ${user.username}`;

    const skillsContainer = document.getElementById("skills-container");
    if (skillsContainer) {
      skillsContainer.innerHTML = "";
      if (user.skills && user.skills.length > 0) {
        user.skills.forEach((skill) => {
          const badge = document.createElement("span");
          badge.style.cssText =
            "background: rgba(255,255,255,0.1); color: #fff; padding: 6px 12px; border-radius: 20px; font-size: 0.9rem; border: 1px solid rgba(255,255,255,0.2);";
          badge.textContent = skill;
          skillsContainer.appendChild(badge);
        });
      } else {
        skillsContainer.innerHTML =
          '<span style="color: #94a3b8; font-style: italic;">Nessuna skill selezionata.</span>';
      }
    }
  } catch (err) {
    console.error("Errore caricamento profilo", err);
  }
}

async function loadMemories(username) {
  try {
    let url = "/api/my-memories";
    if (username) url = `/api/users/${username}/memories`;

    const res = await fetch(url);
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
            <p>${username ? "Questo utente non ha ancora caricato clip." : "Non hai ancora caricato nessuna clip."}</p>
        </div>`;
      return;
    }

    container.innerHTML = "";
    memories.forEach((m) => {
      const bgStyle = m.videoUrl
        ? `background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.8)), url('${m.videoUrl}') center/cover no-repeat;`
        : "";

      let actionsHtml = "";
      if (!username) {
        actionsHtml = `
            <button onclick="deleteMemory('${m._id}')" class="btn-icon delete" title="Elimina"><i class="fas fa-trash"></i></button>
          `;
      }

      const card = `
        <div class="card memory-card" style="${bgStyle}">
            <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%;">
                <h3 style="text-shadow: 0 2px 4px rgba(0,0,0,0.8); color: #fff; margin: 0;">${m.title}</h3>
                ${m.description ? `<p style="font-size: 0.9rem; margin-top: 0.5rem; text-shadow: 0 2px 4px rgba(0,0,0,0.8); color: #e2e8f0; text-align: center;">${m.description}</p>` : ""}
            </div>
            <div style="margin-top: 1rem; display: flex; gap: 10px; z-index: 2;">
                ${actionsHtml}
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
      loadMemories(null);
    } else {
      showToast("Errore durante l'eliminazione", "error");
    }
  } catch (err) {
    console.error(err);
  }
}

function openSkillsModal() {
  const skillCategories = {
    Bridging: [
      "Slowbridging",
      "Fastbridging",
      "Breezily Bridging",
      "Godbridging",
      "Moonwalking",
      "Fruitbridge",
      "Telly Bridging",
      "Andromeda Bridging",
      "Death Bridging",
    ],
    "Movement & Positioning": [
      "Strafing (A+D)",
      "Circular Strafe",
      "Counter-Strafing",
      "Sidebuster",
      "Sprint Resetting",
      "Movement Control",
      "Camera Manipulation",
    ],
    "Hit & Timing": [
      "W-Tap",
      "S-Tap",
      "Block Hitting",
      "Hit Selecting",
      "Jump Resetting",
      "Crit-Chaining",
      "Rodding",
      "Bow Aim",
      "Timing",
      "Fast Clicking",
      "Crosshair Placement",
    ],
    "Clutch & Movement": [
      "Block Clutch",
      "Ladder Clutch",
      "Water Bucket Clutch",
      "Fireball Jump",
      "TNT Jump",
      "Scaffolding Control",
    ],
    "Game Sense": [
      "Minecraft Mechanics",
      "Mining & Caving",
      "Decision Making",
      "Time Management",
      "Inventory Management",
      "Crafting Speed",
      "Looting Speed",
      "Strategy",
      "Positioning",
      "Trapping",
      "Teamwork",
      "Composure",
      "Tracking",
      "Movement",
      "Water Placement",
      "Block Placement",
    ],
  };

  const currentSkills = [];
  document.querySelectorAll("#skills-container span").forEach((el) => {
    if (!el.textContent.includes("Nessuna skill"))
      currentSkills.push(el.textContent);
  });

  const existingModal = document.querySelector(".modal-overlay");
  if (existingModal) existingModal.remove();

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.cssText =
    "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999;";

  let checkboxesHtml = "";

  for (const [category, skills] of Object.entries(skillCategories)) {
    checkboxesHtml += `<h3 style="grid-column: 1 / -1; color: #94a3b8; margin: 1rem 0 0.5rem 0; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">${category}</h3>`;

    skills.forEach((skill) => {
      const checked = currentSkills.includes(skill) ? "checked" : "";
      checkboxesHtml += `
        <label style="display: flex; align-items: center; gap: 10px; background: #23272f; padding: 10px; border-radius: 8px; cursor: pointer; border: 1px solid #334155;">
          <input type="checkbox" value="${skill}" ${checked} style="width: 18px; height: 18px; accent-color: var(--primary-2);">
          <span style="color: #fff;">${skill}</span>
        </label>
      `;
    });
  }

  overlay.innerHTML = `
    <div class="modal" style="background: #181a20; padding: 2rem; border-radius: 16px; width: 100%; max-width: 600px; position: relative; max-height: 80vh; overflow-y: auto;">
      <button class="modal-close" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:1.5rem;color:#fff;cursor:pointer;">&times;</button>
      <h2 style="margin-bottom:1.2rem;text-align:center; color: var(--primary-2);">Seleziona le tue Skills</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 1.5rem;">
        ${checkboxesHtml}
      </div>
      <button id="save-skills-btn" class="btn-primary" style="width:100%;">Salva Skills</button>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector(".modal-close").onclick = () => overlay.remove();

  document.getElementById("save-skills-btn").onclick = async () => {
    const selected = [];
    overlay
      .querySelectorAll("input[type='checkbox']:checked")
      .forEach((cb) => selected.push(cb.value));

    try {
      const res = await fetch("/api/me/skills", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: selected }),
      });
      if (res.ok) {
        showToast("Skills aggiornate!", "success");
        overlay.remove();
        loadUserProfile();
      } else showToast("Errore salvataggio", "error");
    } catch (e) {
      showToast("Errore di connessione", "error");
    }
  };
}
