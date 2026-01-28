let currentTournament = null;
let allTournaments = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadTournamentsList();
    
    const searchInput = document.getElementById('search-subscriber');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderSubscribers(e.target.value.toLowerCase());
        });
    }

    // Dropdown logic
    const selectWrapper = document.querySelector('.custom-select');
    const selectTrigger = document.querySelector('.custom-select__trigger');

    if (selectTrigger) {
        selectTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            selectWrapper.classList.toggle('open');
        });
    }

    window.addEventListener('click', (e) => {
        if (selectWrapper && !selectWrapper.contains(e.target)) {
            selectWrapper.classList.remove('open');
        }
    });

    if (typeof window.enablePageInteractions === 'function') window.enablePageInteractions();
});

async function loadTournamentsList() {
    try {
        const res = await fetch('/api/tournaments');
        allTournaments = await res.json();
        const optionsContainer = document.getElementById('tournament-options');
        const triggerText = document.getElementById('selected-tournament-text');
        
        if (optionsContainer) {
            optionsContainer.innerHTML = '';
            
            if (allTournaments.length === 0) {
                if (triggerText) triggerText.textContent = "Nessun torneo disponibile";
                return;
            }

            allTournaments.forEach(t => {
                const div = document.createElement('div');
                div.className = 'custom-option';
                div.dataset.value = t._id;
                div.textContent = `${t.title} (${t.format ? t.format.toUpperCase() : 'SOLO'}) - ${t.status}`;
                div.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectTournament(t._id);
                });
                optionsContainer.appendChild(div);
            });

            // Auto select first tournament
            if (allTournaments.length > 0) {
                selectTournament(allTournaments[0]._id);
            }
        }

    } catch (e) {
        console.error(e);
        if (typeof showToast === 'function') showToast("Errore caricamento tornei", "error");
    }
}

function selectTournament(tid) {
    currentTournament = allTournaments.find(t => t._id === tid);
    const triggerText = document.getElementById('selected-tournament-text');
    const select = document.querySelector('.custom-select');
    
    if (currentTournament && triggerText) {
        triggerText.textContent = `${currentTournament.title} (${currentTournament.format ? currentTournament.format.toUpperCase() : 'SOLO'}) - ${currentTournament.status}`;
    }
    
    if (select) select.classList.remove('open');
    
    document.querySelectorAll('.custom-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.value === tid);
    });
    
    renderSubscribers();
}

function renderSubscribers(filter = "") {
    const container = document.getElementById('subscribers-container');
    if (!container) return;

    if (!currentTournament) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #94a3b8;">
                Seleziona un torneo per visualizzare gli iscritti.
                <div class="skeleton" style="width: 150px; height: 16px; margin: 0.5rem auto;"></div>
            </div>
        `;
        return;
    }

    const isTeam = currentTournament.format !== 'solo';
    let html = "";
    let count = 0;

    if (isTeam) {
        const teams = currentTournament.teams || [];
        teams.forEach(team => {
            const captain = team.captain || { username: "Unknown" };
            const members = team.teammates || [];
            const allNames = [captain.username, ...members.map(m => m.username || m)].join(" ").toLowerCase();

            if (filter && !allNames.includes(filter)) return;
            count++;

            let membersHtml = members.map(m => {
                const userObj = (typeof m === 'object' && m.userId && typeof m.userId === 'object') ? m.userId : null;
                const mName = userObj ? (userObj.minecraftUsername || userObj.username) : (m.username || m);
                const mId = userObj ? userObj._id : m.userId;
                const kickBtn = mId ? `<i class="fas fa-times" onclick="event.stopPropagation(); kickUser('${currentTournament._id}', '${mId}', false)" style="cursor: pointer; color: #f87171; margin-left: 5px; font-size: 0.8rem; transition: color 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#f87171'" title="Rimuovi membro"></i>` : '';
                return `
                <span style="display: inline-flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 4px; margin-right: 5px;">
                    <i class="fas fa-user" style="font-size: 0.8rem;"></i> ${mName}
                    ${kickBtn}
                </span>
            `}).join("");

            html += `
                <div class="sub-card">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="https://minotar.net/helm/${captain.minecraftUsername || captain.username}/40.png" style="border-radius: 6px;">
                            <div>
                                <div style="font-weight: 600; color: #fff;">${captain.username} <span style="color: var(--primary-2); font-size: 0.8rem; border: 1px solid var(--primary-2); padding: 0 4px; border-radius: 4px;">CAP</span></div>
                                <div style="font-size: 0.85rem; color: #94a3b8;">Team ID: ${team._id ? team._id.toString().substr(-6) : 'N/A'}</div>
                            </div>
                        </div>
                        <div class="team-members">${membersHtml}</div>
                    </div>
                    <button onclick="kickUser('${currentTournament._id}', '${captain._id || captain}', true)" class="btn-icon delete" style="background: rgba(239, 68, 68, 0.2); color: #f87171; width: 40px; height: 40px;" title="Espelli Team"><i class="fas fa-ban"></i></button>
                </div>
            `;
        });
    } else {
        const subs = currentTournament.subscribers || [];
        subs.forEach(sub => {
            if (filter && !sub.username.toLowerCase().includes(filter)) return;
            count++;

            html += `
                <div class="sub-card">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="https://minotar.net/helm/${sub.minecraftUsername || sub.username}/40.png" style="border-radius: 6px;">
                        <div>
                            <div style="font-weight: 600; color: #fff;">${sub.username}</div>
                            <div style="font-size: 0.85rem; color: #94a3b8;">${sub.minecraftUsername || "No MC Nick"}</div>
                        </div>
                    </div>
                    <button onclick="kickUser('${currentTournament._id}', '${sub._id}', false)" class="btn-icon delete" style="background: rgba(239, 68, 68, 0.2); color: #f87171; width: 40px; height: 40px;" title="Espelli Utente"><i class="fas fa-ban"></i></button>
                </div>
            `;
        });
    }

    if (count === 0) html = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #94a3b8;">Nessun iscritto trovato.</div>';
    container.innerHTML = html;
}

window.kickUser = function(tid, uid, isTeam) {
    const msg = isTeam ? "Sei sicuro di voler sciogliere questo team e rimuovere tutti i membri?" : "Sei sicuro di voler espellere questo utente?";
    
    if (typeof window.showConfirmModal === 'function') {
        window.showConfirmModal("Conferma Espulsione", msg, async () => {
            await performKick(tid, uid);
        }, "Espelli");
    } else {
        if (confirm(msg)) {
            performKick(tid, uid);
        }
    }
};

async function performKick(tid, uid) {
    try {
        const res = await fetch(`/api/tournaments/${tid}/kick/${uid}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.ok) {
            if (typeof showToast === 'function') showToast("Espulsione completata", "success");
            
            // Show skeletons while reloading
            const container = document.getElementById('subscribers-container');
            if (container) {
                container.innerHTML = `
                    <div class="sub-card skeleton-card" style="display: flex; align-items: center; gap: 10px; padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 12px;">
                        <div class="skeleton skeleton-circle" style="width: 40px; height: 40px;"></div>
                        <div style="flex: 1;">
                            <div class="skeleton" style="width: 120px; height: 16px; margin-bottom: 6px;"></div>
                            <div class="skeleton" style="width: 80px; height: 12px;"></div>
                        </div>
                        <div class="skeleton" style="width: 40px; height: 40px; border-radius: 8px;"></div>
                    </div>
                    <div class="sub-card skeleton-card" style="display: flex; align-items: center; gap: 10px; padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 12px;">
                        <div class="skeleton skeleton-circle" style="width: 40px; height: 40px;"></div>
                        <div style="flex: 1;">
                            <div class="skeleton" style="width: 120px; height: 16px; margin-bottom: 6px;"></div>
                            <div class="skeleton" style="width: 80px; height: 12px;"></div>
                        </div>
                        <div class="skeleton" style="width: 40px; height: 40px; border-radius: 8px;"></div>
                    </div>
                `;
            }

            const tRes = await fetch('/api/tournaments');
            allTournaments = await tRes.json();
            currentTournament = allTournaments.find(t => t._id === tid);
            const searchInput = document.getElementById('search-subscriber');
            renderSubscribers(searchInput ? searchInput.value.toLowerCase() : "");
        } else {
            if (typeof showToast === 'function') showToast("Errore durante l'espulsione", "error");
        }
    } catch (e) {
        if (typeof showToast === 'function') showToast("Errore di connessione", "error");
    }
}