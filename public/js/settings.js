document.addEventListener("DOMContentLoaded", async () => {
    const saveSettings = async () => {
        const data = {
            newTournament: document.getElementById("setting-new-tournament")?.checked,
            tournamentStart: document.getElementById("setting-tournament-start")?.checked,
            tournamentUpdates: document.getElementById("setting-tournament-update")?.checked,
            tournamentEnd: document.getElementById("setting-tournament-end")?.checked
        };

        try {
            const res = await fetch("/api/me/notification-settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                if (typeof showToast === 'function') showToast("Errore nel salvataggio", "error");
            }
        } catch (e) { 
            if (typeof showToast === 'function') showToast("Errore di connessione", "error"); 
        }
    };

    const savePrivacySettings = async () => {
        const data = {
            showBedwarsStats: document.getElementById("setting-privacy-bw-stats")?.checked,
            showSocials: document.getElementById("setting-privacy-socials")?.checked,
            showSkills: document.getElementById("setting-privacy-skills")?.checked,
            showMemories: document.getElementById("setting-privacy-memories")?.checked,
            allowSkinDownload: document.getElementById("setting-privacy-skin-download")?.checked,
            showProfileLikes: document.getElementById("setting-privacy-profile-likes")?.checked
        };

        try {
            const res = await fetch("/api/me/privacy-settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                if (typeof showToast === 'function') showToast("Errore nel salvataggio privacy", "error");
            }
        } catch (e) { 
            if (typeof showToast === 'function') showToast("Errore di connessione", "error"); 
        }
    };

    try {
        const res = await fetch("/api/me");
        if (res.ok) {
            const user = await res.json();
            const settings = user.notificationSettings || { tournamentStart: true, tournamentUpdates: true, tournamentEnd: true, newTournament: true };
            const privacy = user.privacySettings || { showBedwarsStats: true, showSocials: true, showSkills: true, showMemories: true, allowSkinDownload: true, showProfileLikes: true };
            
            const newTournamentCheck = document.getElementById("setting-new-tournament");
            const startCheck = document.getElementById("setting-tournament-start");
            const updateCheck = document.getElementById("setting-tournament-update");
            const endCheck = document.getElementById("setting-tournament-end");

            const bwStatsCheck = document.getElementById("setting-privacy-bw-stats");
            const socialsCheck = document.getElementById("setting-privacy-socials");
            const skillsCheck = document.getElementById("setting-privacy-skills");
            const memoriesCheck = document.getElementById("setting-privacy-memories");
            const skinDownloadCheck = document.getElementById("setting-privacy-skin-download");
            const profileLikesCheck = document.getElementById("setting-privacy-profile-likes");

            if (newTournamentCheck) newTournamentCheck.checked = settings.newTournament !== false;
            if (startCheck) startCheck.checked = settings.tournamentStart !== false;
            if (updateCheck) updateCheck.checked = settings.tournamentUpdates !== false;
            if (endCheck) endCheck.checked = settings.tournamentEnd !== false;

            if (bwStatsCheck) bwStatsCheck.checked = privacy.showBedwarsStats !== false;
            if (socialsCheck) socialsCheck.checked = privacy.showSocials !== false;
            if (skillsCheck) skillsCheck.checked = privacy.showSkills !== false;
            if (memoriesCheck) memoriesCheck.checked = privacy.showMemories !== false;
            if (skinDownloadCheck) skinDownloadCheck.checked = privacy.allowSkinDownload !== false;
            if (profileLikesCheck) profileLikesCheck.checked = privacy.showProfileLikes !== false;

            [newTournamentCheck, startCheck, updateCheck, endCheck].forEach(el => {
                if (el) el.addEventListener('change', saveSettings);
            });

            [bwStatsCheck, socialsCheck, skillsCheck, memoriesCheck, skinDownloadCheck, profileLikesCheck].forEach(el => {
                if (el) el.addEventListener('change', savePrivacySettings);
            });
        } else {
            window.location.href = "/"; // Redirect se non loggato
        }
    } catch (e) {
        console.error("Errore caricamento impostazioni", e);
    }

    const searchInput = document.getElementById("settings-search");
    const clearSearchBtn = document.getElementById("clear-settings-search");
    if (searchInput) {
        const noResultsEl = document.createElement("div");
        noResultsEl.id = "settings-no-results";
        noResultsEl.style.cssText = "display: none; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4rem 1rem; margin-top: 1rem;";
        noResultsEl.innerHTML = `
            <i class="far fa-sad-tear" style="font-size: 5rem; color: #334155; margin-bottom: 1.5rem;"></i>
            <h3 style="font-size: 1.8rem; margin-bottom: 0.5rem; color: #e2e8f0; font-weight: 700;">Nessun risultato</h3>
            <p style="color: #94a3b8; font-size: 1.1rem; margin-bottom: 1.5rem;">Non abbiamo trovato impostazioni corrispondenti alla tua ricerca.</p>
        `;
        const container = document.querySelector(".container");
        if (container) container.appendChild(noResultsEl);

        if (clearSearchBtn) {
            clearSearchBtn.addEventListener("click", () => {
                searchInput.value = "";
                searchInput.dispatchEvent(new Event("input"));
                searchInput.focus();
            });
        }

        searchInput.addEventListener("input", (e) => {
            const term = e.target.value.toLowerCase();
            if (clearSearchBtn) clearSearchBtn.style.display = term.length > 0 ? "block" : "none";
            const rows = document.querySelectorAll(".toggle-row");
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(term) ? "" : "none";
            });

            let anyVisible = false;
            document.querySelectorAll(".admin-card").forEach(card => {
                const hasVisible = Array.from(card.querySelectorAll(".toggle-row")).some(r => r.style.display !== "none");
                card.style.display = hasVisible ? "block" : "none";
                if (hasVisible) anyVisible = true;
            });
            
            if (noResultsEl) noResultsEl.style.display = anyVisible ? "none" : "flex";
        });
    }

    if (typeof window.enablePageInteractions === 'function') window.enablePageInteractions();
});