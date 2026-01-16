// Admin Players Manager
const ADMIN_PASSWORD = 'SV2026';

class PlayerManager {
    constructor() {
        this.recordManager = new RecordSubmissionManager();
        this.leaderboardManager = new LeaderboardManager();
        this.players = [];
        this.loadPlayers();
    }

    loadPlayers() {
        const allRecords = this.recordManager.getSubmissions().filter(s => s.status === 'accepted');
        const playerMap = {};

        allRecords.forEach(record => {
            const key = record.player.toLowerCase();
            if (!playerMap[key]) {
                playerMap[key] = {
                    id: key,
                    name: record.player,
                    country: record.playerCountry || '',
                    region: record.playerRegion || '',
                    recordsCount: 0,
                    totalPoints: 0,
                    maxPercentage: 0,
                    records: [],
                    originalName: record.player
                };
            }

            const level = this.leaderboardManager.submissionManager.getSubmissions()
                .filter(s => s.status === 'accepted')
                .find(s => s.id === record.levelId);

            if (level) {
                const points = this.leaderboardManager.calculateLevelPoints(level.approvedRank);
                playerMap[key].recordsCount += 1;
                playerMap[key].totalPoints += points;
                playerMap[key].maxPercentage = Math.max(playerMap[key].maxPercentage, record.percentage);
            }
        });

        this.players = Object.values(playerMap).sort((a, b) => b.totalPoints - a.totalPoints);
    }

    updatePlayer(originalName, newData) {
        const allRecords = this.recordManager.getSubmissions();
        const originalKey = originalName.toLowerCase();

        if (newData.name !== originalName) {
            // Renommer le joueur dans tous ses records
            allRecords.forEach(record => {
                if (record.player.toLowerCase() === originalKey) {
                    record.player = newData.name;
                }
            });
        }

        // Mettre à jour les informations géographiques
        allRecords.forEach(record => {
            const recordKey = record.player.toLowerCase();
            const originalLowerCase = originalName.toLowerCase();

            if (recordKey === originalLowerCase || record.player === newData.name) {
                record.playerCountry = newData.country;
                record.playerRegion = newData.region;
            }
        });

        localStorage.setItem(this.recordManager.storageKey, JSON.stringify(allRecords));
        this.loadPlayers();
    }

    deletePlayer(playerName) {
        const allRecords = this.recordManager.getSubmissions();
        const filtered = allRecords.filter(record => record.player.toLowerCase() !== playerName.toLowerCase());
        localStorage.setItem(this.recordManager.storageKey, JSON.stringify(filtered));
        this.loadPlayers();
    }

    searchPlayers(term) {
        if (!term) return this.players;
        return this.players.filter(player =>
            player.name.toLowerCase().includes(term.toLowerCase()) ||
            player.country.toLowerCase().includes(term.toLowerCase())
        );
    }
}

let playerManager = new PlayerManager();

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('playersLoginForm');
    loginForm.addEventListener('submit', handlePlayersLogin);
});

function handlePlayersLogin(event) {
    event.preventDefault();
    const password = document.getElementById('playersPassword').value;
    const loginError = document.getElementById('loginError');

    if (password === ADMIN_PASSWORD) {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('playersSection').classList.remove('hidden');
        renderPlayersList();
    } else {
        loginError.textContent = '❌ Mot de passe incorrect';
        loginError.classList.remove('hidden');
    }
}

function renderPlayersList() {
    playerManager.loadPlayers();
    const container = document.getElementById('playersList');
    const players = playerManager.players;

    // Mettre à jour les stats
    const totalRecords = players.reduce((sum, p) => sum + p.recordsCount, 0);
    document.getElementById('totalPlayers').textContent = players.length;
    document.getElementById('totalRecords').textContent = totalRecords;

    if (players.length === 0) {
        container.innerHTML = '<p class="no-data">Aucun joueur trouvé</p>';
        return;
    }

    container.innerHTML = players.map(player => `
        <div class="player-card">
            <div class="player-card-header">
                <h3>${escapeHtml(player.name)}</h3>
                ${player.country ? `<span class="player-country">${escapeHtml(player.country)}${player.region ? ` - ${escapeHtml(player.region)}` : ''}</span>` : ''}
            </div>
            
            <div class="player-stats-grid">
                <div class="stat-item-small">
                    <div class="stat-label-small">Records</div>
                    <div class="stat-value-small">${player.recordsCount}</div>
                </div>
                <div class="stat-item-small">
                    <div class="stat-label-small">Points</div>
                    <div class="stat-value-small">${player.totalPoints}</div>
                </div>
                <div class="stat-item-small">
                    <div class="stat-label-small">Max %</div>
                    <div class="stat-value-small">${player.maxPercentage}%</div>
                </div>
            </div>

            <div class="player-actions">
                <button class="btn-secondary" onclick="editPlayer('${escapeHtml(player.name)}')">✏️ Modifier</button>
                <button class="btn-delete" onclick="deletePlayer('${escapeHtml(player.name)}')">🗑️ Supprimer</button>
            </div>
        </div>
    `).join('');
}

function editPlayer(playerName) {
    const player = playerManager.players.find(p => p.name === playerName);
    if (!player) return;

    const newName = prompt('Nouveau nom du joueur:', playerName);
    if (!newName || newName === playerName) return;

    // Vérifier que le nouveau nom n'existe pas
    if (playerManager.players.some(p => p.name.toLowerCase() === newName.toLowerCase() && p.name !== playerName)) {
        alert('❌ Ce nom de joueur existe déjà');
        return;
    }

    const newCountry = prompt('Pays:', player.country);
    const newRegion = prompt('Région:', player.region);

    playerManager.updatePlayer(playerName, {
        name: newName,
        country: newCountry || '',
        region: newRegion || ''
    });

    renderPlayersList();
    alert(`✅ Joueur "${playerName}" modifié en "${newName}"`);
}

function deletePlayer(playerName) {
    if (!confirm(`❓ Êtes-vous sûr de vouloir supprimer le joueur "${playerName}" et tous ses records ?`)) {
        return;
    }

    playerManager.deletePlayer(playerName);
    renderPlayersList();
    alert(`✅ Joueur "${playerName}" supprimé`);
}

// Gestion de la recherche
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchPlayer');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const results = playerManager.searchPlayers(e.target.value);
            const container = document.getElementById('playersList');

            if (results.length === 0) {
                container.innerHTML = '<p class="no-data">Aucun joueur trouvé</p>';
                return;
            }

            container.innerHTML = results.map(player => `
                <div class="player-card">
                    <div class="player-card-header">
                        <h3>${escapeHtml(player.name)}</h3>
                        ${player.country ? `<span class="player-country">${escapeHtml(player.country)}${player.region ? ` - ${escapeHtml(player.region)}` : ''}</span>` : ''}
                    </div>
                    
                    <div class="player-stats-grid">
                        <div class="stat-item-small">
                            <div class="stat-label-small">Records</div>
                            <div class="stat-value-small">${player.recordsCount}</div>
                        </div>
                        <div class="stat-item-small">
                            <div class="stat-label-small">Points</div>
                            <div class="stat-value-small">${player.totalPoints}</div>
                        </div>
                        <div class="stat-item-small">
                            <div class="stat-label-small">Max %</div>
                            <div class="stat-value-small">${player.maxPercentage}%</div>
                        </div>
                    </div>

                    <div class="player-actions">
                        <button class="btn-secondary" onclick="editPlayer('${escapeHtml(player.name)}')">✏️ Modifier</button>
                        <button class="btn-delete" onclick="deletePlayer('${escapeHtml(player.name)}')">🗑️ Supprimer</button>
                    </div>
                </div>
            `).join('');
        });
    }
});

// Fonction utilitaire pour échapper le HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
