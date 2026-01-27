document.addEventListener("DOMContentLoaded", async () => {
  const pathParts = window.location.pathname.split("/");

  let profileUsername =
    pathParts.length > 2 && pathParts[2]
      ? decodeURIComponent(pathParts[2])
      : null;

  if (profileUsername === "profile.html") profileUsername = null;

  const p1 = loadUserProfile(profileUsername);
  const p2 = loadMemories(profileUsername);

  const shareProfileBtn = document.getElementById("btn-share-profile");
  if (shareProfileBtn) {
    shareProfileBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
        if (typeof showToast === "function") showToast("Link profilo copiato!", "success");
      });
    });
  }

  const logoutProfileBtn = document.getElementById("btn-logout-profile");
  if (logoutProfileBtn) {
    logoutProfileBtn.addEventListener("click", () => {
      window.location.href = "/logout";
    });
  }

  if (profileUsername) {
    document.body.classList.add("viewing-other-profile");
    const addMemoryBtn = document.getElementById("add-memory-btn");
    const editSkillsBtn = document.getElementById("edit-skills-btn");
    const editSocialsBtn = document.getElementById("edit-socials-btn");
    if (addMemoryBtn) addMemoryBtn.style.display = "none";
    if (logoutProfileBtn) logoutProfileBtn.style.display = "none";
    if (editSkillsBtn) editSkillsBtn.style.display = "none";
    if (editSocialsBtn) editSocialsBtn.style.display = "none";
    
    await Promise.all([p1, p2]);
    if (typeof window.enablePageInteractions === 'function') window.enablePageInteractions();
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

  const saveNickBtn = document.getElementById("save-mc-nick");
  if (saveNickBtn) {
    saveNickBtn.addEventListener("click", async () => {
      const nickInput = document.getElementById("minecraft-nick");
      const val = nickInput.value.trim();
      if (!val) return showToast("Inserisci un nickname valido", "error");

      try {
        const res = await fetch("/api/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ minecraftUsername: val }),
        });
        const data = await res.json();
        if (res.ok) {
          showToast("Nickname salvato!", "success");
          loadUserProfile();
        } else {
          showToast(data.message || "Errore", "error");
        }
      } catch (e) {
        showToast("Errore di connessione", "error");
      }
    });
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

  const nickInput = document.getElementById("minecraft-nick");
  const clearNickBtn = document.getElementById("clear-mc-nick");
  if (nickInput && clearNickBtn) {
    nickInput.addEventListener("input", () => {
      const original = nickInput.dataset.originalValue || "";
      const val = nickInput.value;
      clearNickBtn.style.display = (val.length > 0 && val !== original) ? "block" : "none";
    });
    clearNickBtn.addEventListener("click", () => {
      nickInput.value = "";
      clearNickBtn.style.display = "none";
      nickInput.focus();
    });
  }

  await Promise.all([p1, p2]);
  if (typeof window.enablePageInteractions === 'function') window.enablePageInteractions();
});

async function loadUserProfile(username) {
  const cacheKey = username ? `profile_${username}` : `profile_me`;
  
  // 1. Cache First (Render immediato)
  if (typeof getCache === 'function') {
    const cached = getCache(cacheKey);
    if (cached) renderUserProfile(cached, username);
  }

  try {
    let url = "/api/me";
    if (username) url = `/api/users/${encodeURIComponent(username)}`;

    const res = await fetch(url);
    if (!res.ok) {
      // Mostra errore solo se non abbiamo cache da mostrare
      if (username && (!typeof getCache === 'function' || !getCache(cacheKey))) {
        const notFoundEl = document.getElementById('user-not-found');
        const mainContentEl = document.getElementById('profile-main-content');
        const loadingEl = document.getElementById('profile-loading');

        if (loadingEl) loadingEl.style.display = 'none';
        if (notFoundEl && mainContentEl) {
            mainContentEl.style.display = 'none';
            notFoundEl.style.display = 'flex';
        } else {
            document.querySelector(".container").innerHTML = "<h2 style='text-align:center; margin-top: 50px;'>Utente non trovato</h2>";
        }
      } else if (!username) {
        window.location.href = "/";
      }
      return;
    }
    const user = await res.json();
    
    if (typeof setCache === 'function') setCache(cacheKey, user);

    const notFoundEl = document.getElementById('user-not-found');
    const mainContentEl = document.getElementById('profile-main-content');
    const loadingEl = document.getElementById('profile-loading');

    if (loadingEl) loadingEl.style.display = 'none';
    if (notFoundEl) notFoundEl.style.display = 'none';
    if (mainContentEl) mainContentEl.style.display = 'block';

    renderUserProfile(user, username);
  } catch (err) {
    console.error("Errore caricamento profilo", err);
  }
}

async function renderUserProfile(user, username) {
    // Gestione pulsanti modifica (Spostato all'inizio per evitare flash durante il caricamento async)
    const editSkillsBtn = document.getElementById("edit-skills-btn");
    const editSocialsBtn = document.getElementById("edit-socials-btn");

    if (editSkillsBtn) editSkillsBtn.style.display = user.isSelf ? "flex" : "none";
    if (editSocialsBtn) editSocialsBtn.style.display = user.isSelf ? "flex" : "none";

    document.getElementById("profile-username").textContent = user.username;
    document.getElementById("profile-role").textContent =
      user.role.toUpperCase();

    const nickInput = document.getElementById("minecraft-nick");
    const saveNickBtn = document.getElementById("save-mc-nick");
    const clearNickBtn = document.getElementById("clear-mc-nick");

    if (username) {
      // Gestione visualizzazione nick per altri profili (sostituisce input con span)
      let displaySpan = document.getElementById("mc-nick-display");
      
      if (!displaySpan && nickInput) {
        displaySpan = document.createElement("span");
        displaySpan.id = "mc-nick-display";
        displaySpan.style.cssText =
          "color: #fff; font-size: 1.1rem; margin-left: 5px;";
        nickInput.parentNode.replaceChild(displaySpan, nickInput);
      }
      
      if (displaySpan) {
        displaySpan.innerHTML = user.minecraftUsername
          ? `<i class="fas fa-cube" style="margin-right:5px; color:#22c55e;"></i> ${user.minecraftUsername}`
          : `<span style="color:#94a3b8; font-style:italic;">Nessun nickname MC</span>`;
      }

      if (saveNickBtn) saveNickBtn.remove();
      if (clearNickBtn) clearNickBtn.remove();
    } else {
      if (nickInput) {
        const savedNick = user.minecraftUsername || "";
        nickInput.value = savedNick;
        nickInput.dataset.originalValue = savedNick;
        if (clearNickBtn) clearNickBtn.style.display = "none";
      }
    }

    let avatarUrl = "https://cdn.discordapp.com/embed/avatars/0.png";
    if (user.avatar) {
      avatarUrl = `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`;
    }
    document.getElementById("profile-avatar").src = avatarUrl;

    const killsEl = document.getElementById("stat-kills");
    const deathsEl = document.getElementById("stat-deaths");
    const levelEl = document.getElementById("stat-level");

    const bwWinsEl = document.getElementById("bw-wins");
    const bwLossesEl = document.getElementById("bw-losses");
    const bwKillsEl = document.getElementById("bw-kills");
    const bwDeathsEl = document.getElementById("bw-deaths");
    const bwFinalsEl = document.getElementById("bw-final-kills");
    const bwBedsEl = document.getElementById("bw-beds");
    const bwLevelEl = document.getElementById("bw-level");
    const bwXpEl = document.getElementById("bw-xp");
    const bwKdrEl = document.getElementById("bw-kdr");
    const bwBarWinsEl = document.getElementById("bw-bar-wins");
    const bwBarLossesEl = document.getElementById("bw-bar-losses");
    const bwWinPctEl = document.getElementById("bw-win-pct");
    const bwLossPctEl = document.getElementById("bw-loss-pct");
    const bwWinBar = document.getElementById("bw-win-bar");
    const bwLossBar = document.getElementById("bw-loss-bar");
    const bwWinstreakEl = document.getElementById("bw-winstreak");
    const bwTopWinstreakEl = document.getElementById("bw-top-winstreak");
    const bwSkinRender = document.getElementById("bw-skin-render");
    const bwCardBg = document.getElementById("bw-card-bg");
    const coralStatsLink = document.getElementById("coral-stats-link");

    if (bwCardBg) {
      const statsCard = bwCardBg.closest(".admin-card");
      if (statsCard) {
        statsCard.style.display = (user.minecraftUsername && user.showBedwarsStats !== false) ? "block" : "none";
      }
    }

    if (levelEl)
      levelEl.textContent = (user.points || 0).toLocaleString("it-IT");
    if (killsEl)
      killsEl.textContent = (user.kills || 0).toLocaleString("it-IT");
    if (deathsEl) deathsEl.textContent = "0";

    [
      bwWinsEl,
      bwLossesEl,
      bwKillsEl,
      bwDeathsEl,
      bwFinalsEl,
      bwBedsEl,
      bwLevelEl,
      bwXpEl,
      bwKdrEl,
      bwBarWinsEl,
      bwBarLossesEl,
      bwWinPctEl,
      bwLossPctEl,
      bwWinstreakEl,
      bwTopWinstreakEl
    ].forEach((el) => {
      if (el) el.textContent = "0";
    });

    if (user.minecraftUsername && user.showBedwarsStats !== false) {
      if (coralStatsLink) {
        coralStatsLink.href = `https://coralmc.it/it/stats/player/${user.minecraftUsername}`;
      }

      if (killsEl) killsEl.textContent = "...";
      if (deathsEl) deathsEl.textContent = "...";
      if (bwWinsEl)
        [
          bwWinsEl,
          bwLossesEl,
          bwKillsEl,
          bwDeathsEl,
          bwFinalsEl,
          bwBedsEl,
          bwLevelEl,
          bwXpEl,
          bwKdrEl,
          bwBarWinsEl,
          bwBarLossesEl,
          bwWinPctEl,
          bwLossPctEl,
          bwWinstreakEl,
          bwTopWinstreakEl
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

          if (bwWinsEl)
            bwWinsEl.textContent = (coralData.wins || 0).toLocaleString(
              "it-IT",
            );
          if (bwLossesEl)
            bwLossesEl.textContent = (coralData.looses || 0).toLocaleString(
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
            bwFinalsEl.textContent = (coralData.final_kills || 0).toLocaleString(
              "it-IT",
            );
          if (bwBedsEl)
            bwBedsEl.textContent = (coralData.beds_destroyed || 0).toLocaleString(
              "it-IT",
            );
          if (bwLevelEl)
            bwLevelEl.textContent = (coralData.level || 0).toLocaleString("it-IT");
          if (bwXpEl)
            bwXpEl.textContent = (coralData.xp || 0).toLocaleString("it-IT");

          if (bwKdrEl) {
            const kdr =
              coralData.deaths > 0
                ? (coralData.kills / coralData.deaths).toFixed(2)
                : coralData.kills;
            bwKdrEl.textContent = kdr;
          }
          
          if (bwBarWinsEl && bwBarLossesEl && bwWinBar && bwLossBar) {
            const wins = coralData.wins || 0;
            const losses = coralData.looses || 0;
            const total = wins + losses;
            
            let winPct = 50;
            let lossPct = 50;
            
            if (total > 0) {
                winPct = ((wins / total) * 100).toFixed(1);
                lossPct = ((losses / total) * 100).toFixed(1);
            }
            
            bwBarWinsEl.textContent = wins.toLocaleString("it-IT");
            bwBarLossesEl.textContent = losses.toLocaleString("it-IT");
            if (bwWinPctEl) bwWinPctEl.textContent = `${winPct}%`;
            if (bwLossPctEl) bwLossPctEl.textContent = `${lossPct}%`;
            
            bwWinBar.style.width = `${winPct}%`;
            
            bwLossBar.style.width = `${lossPct}%`;
          }

          if (bwWinstreakEl)
            bwWinstreakEl.textContent = (coralData.currentStreak || 0).toLocaleString(
              "it-IT",
            );
          if (bwTopWinstreakEl)
            bwTopWinstreakEl.textContent = (coralData.maxStreak || 0).toLocaleString("it-IT");

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
              bwWinsEl,
              bwLossesEl,
              bwKillsEl,
              bwDeathsEl,
              bwFinalsEl,
              bwBedsEl,
              bwLevelEl,
              bwXpEl,
              bwKdrEl,
              bwBarWinsEl,
              bwBarLossesEl,
              bwWinPctEl,
              bwLossPctEl,
              bwTopWinstreakEl
            ].forEach((el) => {
              if (el) el.textContent = "-";
            });
          if (typeof showToast === "function")
            showToast(
              `Player ${user.minecraftUsername} non trovato su Minecraft.`,
            );
        }
      } catch (e) {
        console.error("Errore fetch CoralMC", e);
      }
    }

    if (username)
      document.getElementById("memories-title").textContent =
        `Memories di ${user.username}`;

    // Privacy Check for Memories (UI Section)
    const memoriesHeader = document.getElementById("memories-title")?.closest(".section-header-flex");
    const memoriesGrid = document.getElementById("my-memories-grid");
    
    if (!user.isSelf && user.showMemories === false) {
        if (memoriesHeader) memoriesHeader.style.display = "none";
        if (memoriesGrid) memoriesGrid.style.display = "none";
    }

    const skillsContainer = document.getElementById("skills-container");
    if (skillsContainer) {
      const skillsCard = skillsContainer.closest(".admin-card");
      skillsContainer.innerHTML = "";

      const showSkills = user.isSelf || user.showSkills !== false;

      if (showSkills && user.skills && user.skills.length > 0) {
        if (skillsCard) skillsCard.style.display = "block";
        user.skills.forEach((skill) => {
          const badge = document.createElement("span");
          badge.style.cssText =
            "background: rgba(255,255,255,0.1); color: #fff; padding: 6px 12px; border-radius: 20px; font-size: 0.9rem; border: 1px solid rgba(255,255,255,0.2);";
          badge.textContent = skill;
          skillsContainer.appendChild(badge);
        });
      } else {
        if (!user.isSelf || !showSkills) {
            if (skillsCard) skillsCard.style.display = "none";
        } else {
            if (skillsCard) skillsCard.style.display = "block";
            skillsContainer.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Nessuna skill selezionata.</span>';
        }
      }
    }

    const socialsContainer = document.getElementById("header-socials-container");
    if (socialsContainer) {
      socialsContainer.innerHTML = "";
      
      if (user.isSelf || user.showSocials !== false) {
          const socials = user.socials || {};
          const links = [
            { key: "twitch", icon: "fab fa-twitch", color: "#9146FF" },
            { key: "youtube", icon: "fab fa-youtube", color: "#ff0000" },
            { key: "tiktok", icon: "fab fa-tiktok", color: "#fff" },
            { key: "instagram", icon: "fab fa-instagram", color: "#e1306c" },
            { key: "discord", icon: "fab fa-discord", color: "#5865F2" },
          ];

          links.forEach((l) => {
            let handle = socials[l.key];
            if (handle && handle.trim() !== "") {
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
                displayText = `@${cleanHandle}`;
              } else {
                displayText = "Discord Server";
              }

              const a = document.createElement("a");
              a.className = "social-pill";
              a.innerHTML = `<i class="${l.icon}" style="color: ${l.color}; font-size: 1rem;"></i> <span>${displayText}</span>`;
              a.title = displayText;

              a.onmouseover = () => {
                a.style.transform = "translateY(-2px)";
                a.style.borderColor = l.color;
                a.style.background = "rgba(255,255,255,0.05)";
                a.style.boxShadow = `0 4px 12px ${l.color}20`;
                a.style.color = "#fff";
              };
              a.onmouseout = () => {
                a.style.transform = "translateY(0)";
                a.style.borderColor = "rgba(255,255,255,0.1)";
                a.style.background = "rgba(0,0,0,0.3)";
                a.style.boxShadow = "none";
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
                        a.title = `Discord: ${d.guild.name}`;
                        const span = a.querySelector("span");
                        if (span) span.textContent = d.guild.name;
                      }
                    })
                    .catch(() => {});
                }
              } else {
                a.target = "_blank";
                if (l.key === "tiktok") {
                  a.href = `https://www.tiktok.com/@${cleanHandle}`;
                } else if (l.key === "youtube") {
                  a.href = `https://www.youtube.com/@${cleanHandle}`;
                } else if (l.key === "instagram") {
                  a.href = `https://www.instagram.com/${cleanHandle}`;
                } else if (l.key === "twitch") {
                  a.href = `https://www.twitch.tv/${cleanHandle}`;
                }
              }

              socialsContainer.appendChild(a);
            }
          });
      }

      // Hide wrapper if empty and not self
      const wrapper = socialsContainer.closest('.socials-wrapper');
      if (wrapper) {
          if (!user.isSelf && socialsContainer.children.length === 0) {
              wrapper.style.display = 'none';
          } else {
              wrapper.style.display = 'flex';
          }
      }
    }

    // Gestione Like Profilo e Share
    const likeBtn = document.getElementById('btn-like-profile');
    if (likeBtn) {
        const newLikeBtn = likeBtn.cloneNode(true);
        likeBtn.parentNode.replaceChild(newLikeBtn, likeBtn);
        
        const likeCountSpan = newLikeBtn.querySelector('#profile-likes-count');
        const likeIcon = newLikeBtn.querySelector('i');
        const likeLabel = newLikeBtn.querySelector('#profile-likes-label');
        
        newLikeBtn.style.display = 'flex';
        newLikeBtn.style.alignItems = 'center';
        newLikeBtn.style.justifyContent = 'center';
        newLikeBtn.style.gap = '5px';
        
        if (likeCountSpan) likeCountSpan.textContent = user.profileLikesCount || 0;

        if (user.isSelf) {
            newLikeBtn.className = '';
            newLikeBtn.style.cssText = 'background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); padding: 0 15px; height: 42px; border-radius: 6px; color: #fff; cursor: default; display: flex; align-items: center; justify-content: center; gap: 5px;';
            
            if (likeIcon) {
                likeIcon.className = 'fas fa-heart';
                likeIcon.style.color = '#f87171';
            }
            if (likeLabel) likeLabel.textContent = 'Likes';
            
            if (likeCountSpan) {
                likeCountSpan.style.background = 'transparent';
                likeCountSpan.style.padding = '0';
                likeCountSpan.style.marginLeft = '5px';
                likeCountSpan.style.fontSize = '1rem';
            }
        } else {
             newLikeBtn.className = 'btn-visit';
             newLikeBtn.style.cssText = 'background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); display: flex;';
             
             const updateBtnState = (isLiked) => {
                if (isLiked) {
                    if (likeIcon) {
                        likeIcon.classList.remove('far');
                        likeIcon.classList.add('fas');
                    }
                    newLikeBtn.style.background = 'rgba(239, 68, 68, 0.2)';
                    if (likeLabel) likeLabel.textContent = 'Liked';
                } else {
                    if (likeIcon) {
                        likeIcon.classList.remove('fas');
                        likeIcon.classList.add('far');
                    }
                    newLikeBtn.style.background = 'rgba(239, 68, 68, 0.1)';
                    if (likeLabel) likeLabel.textContent = 'Like';
                }
            };

            updateBtnState(user.isProfileLiked);

            newLikeBtn.onclick = async () => {
                if (newLikeBtn.disabled) return;
                newLikeBtn.disabled = true;

                try {
                    const postRes = await fetch(`/api/users/${user.username}/like`, { method: 'POST' });
                    if (postRes.status === 401) {
                        if (typeof showToast === 'function') showToast('Accedi per mettere like!', 'error');
                        return;
                    }
                    
                    const postData = await postRes.json();
                    if (likeCountSpan) likeCountSpan.textContent = postData.count;
                    updateBtnState(postData.liked);
                    if (postData.liked && likeIcon) likeIcon.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.4)' }, { transform: 'scale(1)' }], { duration: 300 });
                } catch (e) { console.error(e); } finally {
                    newLikeBtn.disabled = false;
                }
            };
        }
    }

    const shareBtn = document.getElementById('btn-share-profile');
    if (shareBtn) {
        const newShareBtn = shareBtn.cloneNode(true);
        shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
        newShareBtn.addEventListener('click', () => {
            const link = `${window.location.origin}/profile/${user.username}`;
            navigator.clipboard.writeText(link).then(() => {
                if (typeof showToast === 'function') showToast('Link profilo copiato!', 'success');
            });
        });
    }

    if (typeof socket !== 'undefined') {
        socket.off('profile:update');
        socket.on('profile:update', (evt) => {
            if (evt.username === user.username) {
                const countSpan = document.getElementById('profile-likes-count');
                if (countSpan) countSpan.textContent = evt.profileLikesCount;
            }
        });
    }
}

async function loadMemories(username) {
  const cacheKey = username ? `memories_${username}` : `memories_my`;
  const container = document.getElementById("my-memories-grid");
  
  // Recupera utente corrente dalla cache (per i like)
  let currentUser = typeof getCache === 'function' ? getCache('user_me') : null;

  // 1. Cache First
  if (typeof getCache === 'function') {
    const cachedMemories = getCache(cacheKey);
    if (cachedMemories) renderProfileMemories(cachedMemories, username, currentUser, container);
  }

  try {
    let url = "/api/my-memories";

    if (username) {
      url = `/api/users/${encodeURIComponent(username)}/memories`;
    }

    // Aggiorna currentUser dalla rete
    try {
      const sessionRes = await fetch("/api/session");
      if (sessionRes.ok) {
        currentUser = (await sessionRes.json()).user;
        if (typeof setCache === 'function') setCache('user_me', currentUser);
      }
    } catch (e) {}

    const res = await fetch(url);
    if (!res.ok) {
      console.error("Errore fetch memories:", res.status);
      return;
    }

    const memories = await res.json();
    if (typeof setCache === 'function') setCache(cacheKey, memories);
    
    renderProfileMemories(memories, username, currentUser, container);
  } catch (err) {
    console.error("Errore caricamento memories", err);
  }
}

function renderProfileMemories(memories, username, currentUser, container) {
    let currentAuthorName = username || (currentUser ? currentUser.username : "Utente");
    const memoriesHeader = document.getElementById("memories-title")?.closest(".section-header-flex");
    
    const isOwner = !username || (currentUser && currentUser.username === username);

    if (!Array.isArray(memories) || memories.length === 0) {
      if (!isOwner) {
          // Visitatore: nascondi la sezione se non ci sono memories (o sono private)
          container.innerHTML = "";
          container.style.display = "none";
          if (memoriesHeader) memoriesHeader.style.display = "none";
      } else {
          // Proprietario: mostra stato vuoto
          if (memoriesHeader) memoriesHeader.style.display = "flex";
          container.style.display = "grid";
          container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-film"></i>
                <h3>Nessuna Memory</h3>
                <p>Non hai ancora caricato nessuna clip.</p>
            </div>`;
      }
      return;
    }

    if (memoriesHeader) memoriesHeader.style.display = "flex";
    container.style.display = "grid";
    container.innerHTML = "";
    memories.forEach((m) => {
      const likesCount = m.likes ? m.likes.length : 0;
      const sharesCount = (m.shares && Array.isArray(m.shares)) ? m.shares.length : 0;
      const isLiked =
        currentUser && m.likes && m.likes.includes(currentUser.discordId);

      const safeTitle = (m.title || "Memory").replace(/'/g, "\\'").replace(/"/g, "&quot;");
      const safeAuthor = (currentAuthorName || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");

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
        media = `<img src="${m.videoUrl}" alt="Memory" onclick="event.stopPropagation(); openMediaModal('${m.videoUrl}', 'image', '${m._id}', '${safeAuthor}', ${likesCount}, ${sharesCount}, ${isLiked})" style="width:100%;height:180px;object-fit:cover;border-radius:10px; cursor: zoom-in;">`;
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
                <button onclick="event.stopPropagation(); shareMemory('${m._id}', '${safeAuthor}', '${safeTitle}', this)" class="btn-icon" style="width: auto; padding: 5px 10px; gap: 6px; background: transparent; color: #cbd5e1; font-size: 0.9rem;">
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
}

function deleteMemory(id) {
  window.showConfirmModal("Elimina Memory", "Sei sicuro di voler eliminare questa memory?", async () => {
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
  });
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
      <button id="save-socials-btn" class="btn-visit" style="width:100%; justify-content: center;">Salva Modifiche</button>
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
        showToast("Social aggiornati!", "success");
        overlay.remove();
        loadUserProfile();
      } else {
        showToast("Errore nel salvataggio", "error");
      }
    } catch (e) {
      showToast("Errore di connessione", "error");
    }
  };

  document.getElementById("save-socials-btn").addEventListener("click", saveSocials);
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}
