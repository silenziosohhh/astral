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

  const editSkillsBtn = document.getElementById("edit-skills-btn");
  if (editSkillsBtn) {
    editSkillsBtn.addEventListener("click", openSkillsModal);
  }

  const editSocialsBtn = document.getElementById("edit-socials-btn");
  if (editSocialsBtn) {
    editSocialsBtn.addEventListener("click", openSocialsModal);
  }

  const searchInput = document.getElementById("search-profile-memories");
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

async function loadUserProfile(username) {
  try {
    let url = "/api/me";
    if (username) url = `/api/users/${encodeURIComponent(username)}`;

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

    const killsEl = document.getElementById("stat-kills");
    const deathsEl = document.getElementById("stat-deaths");
    const levelEl = document.getElementById("stat-level");

    const bwLevelEl = document.getElementById("bw-level-display");
    const bwWinsEl = document.getElementById("bw-wins");
    const bwKillsEl = document.getElementById("bw-kills");
    const bwDeathsEl = document.getElementById("bw-deaths");
    const bwFinalsEl = document.getElementById("bw-final-kills");
    const bwFinalDeathsEl = document.getElementById("bw-final-deaths");
    const bwBedsEl = document.getElementById("bw-beds");
    const bwKdrEl = document.getElementById("bw-kdr");
    const bwFkdrEl = document.getElementById("bw-fkdr");
    const bwGamesEl = document.getElementById("bw-games");
    const bwWlrEl = document.getElementById("bw-wlr");
    const bwSkinRender = document.getElementById("bw-skin-render");
    const bwCardBg = document.getElementById("bw-card-bg");

    if (levelEl)
      levelEl.textContent = (user.points || 0).toLocaleString("it-IT");
    if (killsEl)
      killsEl.textContent = (user.kills || 0).toLocaleString("it-IT");
    if (deathsEl) deathsEl.textContent = "0";

    [
      bwLevelEl,
      bwWinsEl,
      bwKillsEl,
      bwDeathsEl,
      bwFinalsEl,
      bwBedsEl,
      bwKdrEl,
      bwFkdrEl,
      bwFinalDeathsEl,
      bwGamesEl,
      bwWlrEl,
    ].forEach((el) => {
      if (el) el.textContent = "0";
    });

    if (user.minecraftUsername) {
      if (killsEl) killsEl.textContent = "...";
      if (deathsEl) deathsEl.textContent = "...";
      if (bwWinsEl)
        [
          bwLevelEl,
          bwWinsEl,
          bwKillsEl,
          bwDeathsEl,
          bwFinalsEl,
          bwBedsEl,
          bwKdrEl,
          bwFkdrEl,
          bwFinalDeathsEl,
          bwGamesEl,
          bwWlrEl,
        ].forEach((el) => {
          if (el) el.textContent = "...";
        });

      try {
        const coralRes = await fetch(
          `/api/proxy/coralmc/${user.minecraftUsername}`,
        );
        if (coralRes.ok) {
          const coralData = await coralRes.json();

          if (killsEl) {
            killsEl.textContent = (coralData.kills || 0).toLocaleString(
              "it-IT",
            );
            const p = killsEl.parentElement.querySelector("p");
            if (p)
              p.innerHTML =
                'Uccisioni <small style="color:var(--primary-2)">(CoralMC)</small>';
          }
          if (deathsEl) {
            deathsEl.textContent = (coralData.deaths || 0).toLocaleString(
              "it-IT",
            );
            const p = deathsEl.parentElement.querySelector("p");
            if (p)
              p.innerHTML =
                'Morti <small style="color:var(--primary-2)">(CoralMC)</small>';
          }

          if (bwLevelEl)
            bwLevelEl.textContent = (coralData.level || 0).toLocaleString(
              "it-IT",
            );
          if (bwWinsEl)
            bwWinsEl.textContent = (coralData.wins || 0).toLocaleString(
              "it-IT",
            );
          if (bwKillsEl)
            bwKillsEl.textContent = (coralData.kills || 0).toLocaleString(
              "it-IT",
            );
          if (bwDeathsEl)
            bwDeathsEl.textContent = (coralData.deaths || 0).toLocaleString(
              "it-IT",
            );
          if (bwFinalsEl)
            bwFinalsEl.textContent = (coralData.finals || 0).toLocaleString(
              "it-IT",
            );
          if (bwFinalDeathsEl)
            bwFinalDeathsEl.textContent = (
              coralData.finalDeaths || 0
            ).toLocaleString("it-IT");
          if (bwBedsEl)
            bwBedsEl.textContent = (coralData.beds || 0).toLocaleString(
              "it-IT",
            );
          if (bwGamesEl)
            bwGamesEl.textContent = (coralData.games || 0).toLocaleString(
              "it-IT",
            );

          if (bwKdrEl) {
            const kdr =
              coralData.deaths > 0
                ? (coralData.kills / coralData.deaths).toFixed(2)
                : coralData.kills;
            bwKdrEl.textContent = kdr;
          }
          if (bwFkdrEl) {
            const fd = coralData.finalDeaths || 0;
            const fkdr =
              fd > 0 ? (coralData.finals / fd).toFixed(2) : coralData.finals;
            bwFkdrEl.textContent = fkdr;
          }
          if (bwWlrEl) {
            const losses = (coralData.games || 0) - (coralData.wins || 0);
            const wlr =
              losses > 0
                ? (coralData.wins / losses).toFixed(2)
                : coralData.wins;
            bwWlrEl.textContent = wlr;
          }

          if (bwSkinRender) {
            const skinUrl = coralData.uuid
              ? `https://visage.surgeplay.com/full/512/${coralData.uuid}`
              : `https://minotar.net/armor/body/${user.minecraftUsername}/300.png`;
            bwSkinRender.src = skinUrl;
            if (bwCardBg)
              bwCardBg.style.backgroundImage = `url('https://minotar.net/helm/${user.minecraftUsername}/100.png')`;
          }
        } else if (coralRes.status === 404) {
          if (killsEl) killsEl.textContent = "Non trovato";
          if (deathsEl) deathsEl.textContent = "Non trovato";
          if (bwWinsEl)
            [
              bwLevelEl,
              bwWinsEl,
              bwKillsEl,
              bwDeathsEl,
              bwFinalsEl,
              bwBedsEl,
              bwKdrEl,
              bwFkdrEl,
              bwFinalDeathsEl,
              bwGamesEl,
              bwWlrEl,
            ].forEach((el) => {
              if (el) el.textContent = "-";
            });
          if (typeof showToast === "function")
            showToast(
              `Player ${user.minecraftUsername} non trovato su CoralMC`,
              "error",
            );
        }
      } catch (e) {
        console.error("Errore fetch CoralMC", e);
      }
    }

    const editSkillsBtn = document.getElementById("edit-skills-btn");
    const editSocialsBtn = document.getElementById("edit-socials-btn");

    if (username && editSkillsBtn) {
      editSkillsBtn.style.display = "none";
    }
    if (username && editSocialsBtn) {
      editSocialsBtn.style.display = "none";
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

    const socialsDisplay = document.getElementById("socials-display");
    if (socialsDisplay) {
      socialsDisplay.innerHTML = "";
      const socials = user.socials || {};
      const links = [
        { key: "twitch", icon: "fab fa-twitch", color: "#9146FF" },
        { key: "youtube", icon: "fab fa-youtube", color: "#ff0000" },
        { key: "tiktok", icon: "fab fa-tiktok", color: "#fff" },
        { key: "instagram", icon: "fab fa-instagram", color: "#e1306c" },
        { key: "discord", icon: "fab fa-discord", color: "#5865F2" },
      ];

      let count = 0;
      links.forEach((l) => {
        let handle = socials[l.key];
        if (handle && handle.trim() !== "") {
          count++;
          handle = handle.trim();

          let cleanHandle = handle;
          let displayText = handle;

          if (l.key !== "discord") {
            cleanHandle = handle
              .replace(/^@/, "")
              .replace(/^(https?:\/\/)?(www\.)?/, "")
              .replace(
                /^(tiktok\.com\/@|youtube\.com\/@|instagram\.com\/|twitch\.tv\/)/,
                "",
              )
              .replace(/\/$/, "");
            displayText = cleanHandle;
          } else {
            displayText = "Discord Server";
          }

          const a = document.createElement("a");
          a.style.cssText =
            "display: flex; align-items: center; gap: 10px; padding: 8px 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; transition: 0.2s; text-decoration: none; cursor: pointer; color: #e2e8f0; font-weight: 500; font-size: 0.9rem;";
          a.innerHTML = `<i class="${l.icon}" style="color: ${l.color}; font-size: 1.2rem;"></i> <span>${displayText}</span>`;
          a.onmouseover = () => {
            a.style.background = "rgba(255,255,255,0.1)";
            a.style.borderColor = "rgba(255,255,255,0.2)";
            a.style.color = "#fff";
          };
          a.onmouseout = () => {
            a.style.background = "rgba(255,255,255,0.05)";
            a.style.borderColor = "rgba(255,255,255,0.1)";
            a.style.color = "#e2e8f0";
          };

          if (l.key === "discord") {
            a.target = "_blank";
            let inviteCode = handle;

            if (handle.startsWith("http")) {
              a.href = handle;
              const match = handle.match(
                /(?:discord\.gg\/|discord\.com\/invite\/)([^/]+)/,
              );
              if (match) inviteCode = match[1];
            } else if (
              handle.includes("discord.gg") ||
              handle.includes("discord.com/invite")
            ) {
              a.href = `https://${handle}`;
              const match = handle.match(
                /(?:discord\.gg\/|discord\.com\/invite\/)([^/]+)/,
              );
              if (match) inviteCode = match[1];
            } else {
              a.href = `https://discord.gg/${handle}`;
              inviteCode = handle;
            }

            if (inviteCode) {
              fetch(`https://discord.com/api/v9/invites/${inviteCode}`)
                .then((r) => r.json())
                .then((d) => {
                  if (d.guild && d.guild.name) {
                    a.querySelector("span").textContent = d.guild.name;
                  }
                })
                .catch(() => {});
            }
          } else {
            a.target = "_blank";
            if (l.key === "tiktok") {
              a.href = `https://www.tiktok.com/@${cleanHandle}`;
              a.querySelector("span").textContent = `@${cleanHandle}`;
            } else if (l.key === "youtube") {
              a.href = `https://www.youtube.com/@${cleanHandle}`;
              a.querySelector("span").textContent = `@${cleanHandle}`;
            } else if (l.key === "instagram") {
              a.href = `https://www.instagram.com/${cleanHandle}`;
              a.querySelector("span").textContent = `@${cleanHandle}`;
            } else if (l.key === "twitch") {
              a.href = `https://www.twitch.tv/${cleanHandle}`;
              a.querySelector("span").textContent = cleanHandle;
            }
          }

          socialsDisplay.appendChild(a);
        }
      });

      if (count === 0) {
        socialsDisplay.innerHTML =
          '<span style="color: #94a3b8; font-style: italic;">Nessun social collegato.</span>';
      }
    }
  } catch (err) {
    console.error("Errore caricamento profilo", err);
  }
}

async function loadMemories(username) {
  try {
    let url = "/api/my-memories";
    let currentAuthorName = username;

    if (username) {
      url = `/api/users/${encodeURIComponent(username)}/memories`;
    } else {
      try {
        const meRes = await fetch("/api/me");
        if (meRes.ok) {
          const me = await meRes.json();
          currentAuthorName = me.username;
        }
      } catch (e) {}
    }

    let currentUser = null;
    try {
      const meRes = await fetch("/api/me");
      if (meRes.ok) currentUser = await meRes.json();
    } catch (e) {}

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
          media = `<a href="${m.videoUrl}" target="_blank" style="display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.videoUrl}</a>`;
        }
      } else if (
        m.videoUrl &&
        /\.(jpg|jpeg|png|webp|gif|bmp)(\?.*)?$/i.test(m.videoUrl)
      ) {
        media = `<img src="${m.videoUrl}" alt="Memory" onclick="event.stopPropagation(); openMediaModal('${m.videoUrl}', 'image', '${m._id}', '${currentAuthorName || ""}', ${likesCount}, ${sharesCount}, ${isLiked})" style="width:100%;height:180px;object-fit:cover;border-radius:10px; cursor: zoom-in;">`;
      } else if (m.videoUrl) {
        media = `<a href="${m.videoUrl}" target="_blank" onclick="event.stopPropagation()" style="display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.videoUrl}</a>`;
      }

      const date = m.createdAt
        ? new Date(m.createdAt).toLocaleDateString()
        : "";

      const authorHtml = currentAuthorName
        ? `<div onclick="event.stopPropagation(); window.location.href='/profile/${encodeURIComponent(currentAuthorName)}'" style="margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--primary-2); font-weight: 600; cursor: pointer; display: inline-block;"><i class="fas fa-user" style="margin-right: 5px;"></i> ${currentAuthorName}</div>`
        : "";

      let deleteBtn = "";
      if (!username) {
        deleteBtn = `<button onclick="event.stopPropagation(); deleteMemory('${m._id}')" class="btn-icon delete" title="Elimina" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: #ef4444; z-index: 10;"><i class="fas fa-trash"></i></button>`;
      }

      const heartClass = isLiked ? "fas" : "far";
      const heartColor = isLiked ? "#ef4444" : "#cbd5e1";

      const card = `
        <div id="memory-${m._id}" class="card memory-card" onclick="window.location.href='/profile/${encodeURIComponent(currentAuthorName)}?memory=${m._id}'" style="min-height:320px; display:flex; flex-direction:column; justify-content:space-between; position: relative; cursor: pointer;">
            ${deleteBtn}
            <div>
                ${media}
                <h3 style="margin:0.7rem 0 0.3rem 0;">${m.title || "Memory"}</h3>
                ${authorHtml}
                <p style="font-size:0.98em; color:#aaa; margin-bottom:0.5rem;">${date}</p>
                <p style="margin-bottom:0.7rem;">${m.description ? m.description : ""}</p>
            </div>
            <div style="display: flex; gap: 15px; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                <button onclick="event.stopPropagation(); toggleLike(this, '${m._id}')" class="btn-icon" style="width: auto; padding: 5px 10px; gap: 6px; background: transparent; color: #cbd5e1; font-size: 0.9rem;">
                    <i class="${heartClass} fa-heart" style="font-size: 1.1rem; color: ${heartColor};"></i> <span>${likesCount}</span>
                </button>
                <button onclick="event.stopPropagation(); shareMemory('${m._id}', '${currentAuthorName || ""}', '${m.title || "Memory"}', this)" class="btn-icon" style="width: auto; padding: 5px 10px; gap: 6px; background: transparent; color: #cbd5e1; font-size: 0.9rem;">
                    <i class="fas fa-share" style="font-size: 1.1rem;"></i> <span>${sharesCount}</span>
                </button>
            </div>
        </div>
      `;
      container.innerHTML += card;
    });

    const urlParams = new URLSearchParams(window.location.search);
    const memoryId = urlParams.get("memory");
    if (memoryId) {
      setTimeout(() => {
        const element = document.getElementById(`memory-${memoryId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);
    }
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
        <label class="skill-item">
          <input type="checkbox" value="${skill}" ${checked}>
          <span class="skill-name">${skill}</span>
          <div class="skill-check-icon"><i class="fas fa-check"></i></div>
        </label>
      `;
    });
  }

  overlay.innerHTML = `
    <style>
      .modal-custom { background: #181a20; padding: 2rem; border-radius: 16px; width: 90%; max-width: 600px; position: relative; max-height: 80vh; overflow-y: auto; }
      .skills-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 1.5rem; }
      
      .skill-item {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 12px 16px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        user-select: none;
      }
      .skill-item:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.2);
      }
      .skill-item input {
        display: none;
      }
      .skill-item:has(input:checked) {
        background: rgba(59, 130, 246, 0.15);
        border-color: var(--primary-2);
        box-shadow: 0 0 15px rgba(59, 130, 246, 0.15);
      }
      .skill-name {
        font-weight: 500;
        color: #cbd5e1;
        transition: color 0.2s;
      }
      .skill-item:has(input:checked) .skill-name {
        color: #fff;
        font-weight: 600;
      }
      .skill-check-icon {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 2px solid #475569;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      .skill-item:has(input:checked) .skill-check-icon {
        background: var(--primary-2);
        border-color: var(--primary-2);
      }
      .skill-check-icon i {
        font-size: 0.7rem;
        color: #000;
        opacity: 0;
        transform: scale(0.5);
        transition: all 0.2s;
      }
      .skill-item:has(input:checked) .skill-check-icon i {
        opacity: 1;
        transform: scale(1);
      }

      @media (max-width: 600px) { .modal-custom { padding: 1.5rem; width: 95%; } .skills-grid { grid-template-columns: 1fr; } }
    </style>
    <div class="modal-custom">
      <button class="modal-close" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:1.5rem;color:#fff;cursor:pointer;">&times;</button>
      <h2 style="margin-bottom:1.2rem;text-align:center; color: var(--primary-2);">Seleziona le tue Skills</h2>
      <div class="skills-grid">
        ${checkboxesHtml}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector(".modal-close").onclick = () => overlay.remove();
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };

  const saveSkills = async () => {
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
        loadUserProfile();
      }
    } catch (e) {}
  };

  overlay.querySelectorAll("input[type='checkbox']").forEach((cb) => {
    cb.addEventListener("change", saveSkills);
  });
}

async function openSocialsModal() {
  let userSocials = {};
  try {
    const res = await fetch("/api/me");
    if (res.ok) {
      const user = await res.json();
      userSocials = user.socials || {};
    }
  } catch (e) {
    console.error(e);
  }

  const existingModal = document.querySelector(".modal-overlay");
  if (existingModal) existingModal.remove();

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.cssText =
    "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 9999;";

  const socialFields = [
    {
      id: "twitch",
      icon: "fab fa-twitch",
      color: "#9146FF",
      placeholder: "Twitch @",
    },
    {
      id: "youtube",
      icon: "fab fa-youtube",
      color: "#ff0000",
      placeholder: "YouTube @",
    },
    {
      id: "tiktok",
      icon: "fab fa-tiktok",
      color: "#fff",
      placeholder: "TikTok @",
    },
    {
      id: "instagram",
      icon: "fab fa-instagram",
      color: "#e1306c",
      placeholder: "Instagram @",
    },
    {
      id: "discord",
      icon: "fab fa-discord",
      color: "#5865F2",
      placeholder: "Discord Server",
    },
  ];

  let fieldsHtml = "";
  socialFields.forEach((field) => {
    const value = userSocials[field.id] || "";
    const showClear = value ? "block" : "none";
    fieldsHtml += `
      <div style="display: flex; align-items: center; gap: 10px; background: rgba(0, 0, 0, 0.4); padding: 12px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 10px;">
        <i class="${field.icon}" style="font-size: 1.2rem; width: 24px; text-align: center; color: ${field.color};"></i>
        <div style="position: relative; flex-grow: 1;">
          <input type="text" id="modal-social-${field.id}" value="${value}" placeholder="${field.placeholder}" style="background: transparent; border: none; color: #fff; width: 100%; outline: none; padding-right: 25px;">
          <i class="fas fa-times clear-social-input" data-target="modal-social-${field.id}" style="position: absolute; right: 0; top: 50%; transform: translateY(-50%); cursor: pointer; color: #94a3b8; display: ${showClear}; font-size: 0.9rem;"></i>
        </div>
      </div>
    `;
  });

  overlay.innerHTML = `
    <style>
      .modal-custom { background: #181a20; padding: 2rem; border-radius: 16px; width: 90%; max-width: 500px; position: relative; }
      @media (max-width: 500px) { .modal-custom { padding: 1.5rem; width: 95%; } }
    </style>
    <div class="modal-custom">
      <button class="modal-close" style="position:absolute;top:12px;right:12px;background:none;border:none;font-size:1.5rem;color:#fff;cursor:pointer;">&times;</button>
      <h2 style="margin-bottom:1.5rem;text-align:center; color: var(--primary-2);">Gestisci Social Media</h2>
      <div style="margin-bottom: 1.5rem;">
        ${fieldsHtml}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelectorAll(".clear-social-input").forEach((btn) => {
    btn.onclick = () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (input) {
        input.value = "";
        btn.style.display = "none";
        input.focus();
        input.dispatchEvent(new Event("input"));
      }
    };
  });

  overlay.querySelectorAll("input[type='text']").forEach((input) => {
    input.addEventListener("input", function () {
      const btn = this.parentElement.querySelector(".clear-social-input");
      if (btn) {
        btn.style.display = this.value.length > 0 ? "block" : "none";
      }
    });
  });

  overlay.querySelector(".modal-close").onclick = () => overlay.remove();
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };

  const saveSocials = async () => {
    const data = {
      twitch: document.getElementById("modal-social-twitch").value.trim(),
      youtube: document.getElementById("modal-social-youtube").value.trim(),
      tiktok: document.getElementById("modal-social-tiktok").value.trim(),
      instagram: document.getElementById("modal-social-instagram").value.trim(),
      discord: document.getElementById("modal-social-discord").value.trim(),
    };

    try {
      const res = await fetch("/api/me/socials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        loadUserProfile();
      }
    } catch (e) {}
  };

  const debouncedSave = debounce(saveSocials, 1000);

  overlay.querySelectorAll("input[type='text']").forEach((input) => {
    input.addEventListener("input", debouncedSave);
  });
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}
