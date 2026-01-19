// Admin Users Manager (Joueurs + Vérificateurs)

// La vérification admin est désormais faite côté HTML via Supabase Auth
// (voir admin-users.html)

class UserManager {
    constructor() {
        this.recordManager = new RecordSubmissionManager();
        this.submissionManager = new SubmissionManager();
        this.leaderboardManager = new LeaderboardManager();
        this.players = [];
        this.verifiers = [];
        this.loadUsers();
    }

    loadUsers() {
        this.loadPlayers();
        this.loadVerifiers();
    }

    // === JOUEURS ===
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
                    originalName: record.player,
                    type: 'player'
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

    // === VÉRIFICATEURS ===
    loadVerifiers() {
        const allSubmissions = this.submissionManager.getSubmissions().filter(s => s.status === 'accepted');
        const verifierMap = {};

        allSubmissions.forEach(submission => {
            const key = submission.authorName.toLowerCase();
            if (!verifierMap[key]) {
                verifierMap[key] = {
                    id: key,
                    name: submission.authorName,
                    country: submission.playerCountry || '',
                    region: submission.playerRegion || '',
                    levelsVerified: 0,
                    totalPoints: 0,
                    levels: [],
                    originalName: submission.authorName,
                    type: 'verifier'
                };
            }

            const points = this.leaderboardManager.calculateLevelPoints(submission.approvedRank);
            verifierMap[key].levelsVerified += 1;
            verifierMap[key].totalPoints += points;

            verifierMap[key].levels.push({
                levelName: submission.levelName,
                levelId: submission.id,
                points: points,
                rank: submission.approvedRank
            });
        });

        this.verifiers = Object.values(verifierMap).sort((a, b) => b.totalPoints - a.totalPoints);
    }

    // === MISE À JOUR JOUEUR ===
    updatePlayer(originalName, newData) {
        const allRecords = this.recordManager.getSubmissions();
        const originalKey = originalName.toLowerCase();

        if (newData.name !== originalName) {
            allRecords.forEach(record => {
                if (record.player.toLowerCase() === originalKey) {
                    record.player = newData.name;
                }
            });
        }

        allRecords.forEach(record => {
            if (record.player === newData.name || record.player.toLowerCase() === originalKey) {
                record.playerCountry = newData.country;
                record.playerRegion = newData.region;
            }
        });

        localStorage.setItem(this.recordManager.storageKey, JSON.stringify(allRecords));
        this.loadPlayers();
    }

    // === SUPPRESSION JOUEUR ===
    deletePlayer(playerName) {
        const allRecords = this.recordManager.getSubmissions();
        const filtered = allRecords.filter(record => record.player.toLowerCase() !== playerName.toLowerCase());
        localStorage.setItem(this.recordManager.storageKey, JSON.stringify(filtered));
        this.loadPlayers();
    }

    // === MISE À JOUR VÉRIFICATEUR ===
    updateVerifier(originalName, newData) {
        const allSubmissions = this.submissionManager.getSubmissions();
        const originalKey = originalName.toLowerCase();

        if (newData.name !== originalName) {
            allSubmissions.forEach(submission => {
                if (submission.authorName.toLowerCase() === originalKey) {
                    submission.authorName = newData.name;
                }
            });
        }

        allSubmissions.forEach(submission => {
            if (submission.authorName === newData.name || submission.authorName.toLowerCase() === originalKey) {
                submission.playerCountry = newData.country;
                submission.playerRegion = newData.region;
            }
        });

        localStorage.setItem(this.submissionManager.storageKey, JSON.stringify(allSubmissions));
        this.loadVerifiers();
    }

    // === SUPPRESSION VÉRIFICATEUR ===
    deleteVerifier(verifierName) {
        const allSubmissions = this.submissionManager.getSubmissions();
        const filtered = allSubmissions.filter(submission => submission.authorName.toLowerCase() !== verifierName.toLowerCase());
        localStorage.setItem(this.submissionManager.storageKey, JSON.stringify(filtered));
        this.loadVerifiers();
    }

    // === RECHERCHE JOUEURS ===
    searchPlayers(term) {
        if (!term) return this.players;
        return this.players.filter(player =>
            player.name.toLowerCase().includes(term.toLowerCase()) ||
            player.country.toLowerCase().includes(term.toLowerCase())
        );
    }

    // === RECHERCHE VÉRIFICATEURS ===
    searchVerifiers(term) {
        if (!term) return this.verifiers;
        return this.verifiers.filter(verifier =>
            verifier.name.toLowerCase().includes(term.toLowerCase()) ||
            verifier.country.toLowerCase().includes(term.toLowerCase())
        );
    }
}

let userManager = new UserManager();

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('usersLoginForm');
    loginForm.addEventListener('submit', handleUsersLogin);

    // Gestion des recherches
    const searchPlayer = document.getElementById('searchPlayer');
    if (searchPlayer) {
        searchPlayer.addEventListener('input', (e) => renderPlayersList(e.target.value));
    }

    const searchVerifier = document.getElementById('searchVerifier');
    if (searchVerifier) {
        searchVerifier.addEventListener('input', (e) => renderVerifiersList(e.target.value));
    }
});

function handleUsersLogin(event) {
    event.preventDefault();
    const password = document.getElementById('usersPassword').value;
    const loginError = document.getElementById('loginError');

    if (password === ADMIN_PASSWORD) {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('usersSection').classList.remove('hidden');
        renderPlayersList();
    } else {
        loginError.textContent = '❌ Mot de passe incorrect';
        loginError.classList.remove('hidden');
    }
}

function switchTab(tabName) {
    // Masquer tous les onglets
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    // Désactiver tous les boutons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Afficher l'onglet sélectionné
    if (tabName === 'players') {
        document.getElementById('playersTab').classList.remove('hidden');
        document.querySelector('button[onclick="switchTab(\'players\')"]').classList.add('active');
        renderPlayersList();
    } else if (tabName === 'verifiers') {
        document.getElementById('verifiersTab').classList.remove('hidden');
        document.querySelector('button[onclick="switchTab(\'verifiers\')"]').classList.add('active');
        renderVerifiersList();
    }
}

// === AFFICHAGE JOUEURS ===
function renderPlayersList(searchTerm = '') {
    userManager.loadPlayers();
    const container = document.getElementById('playersList');
    const players = searchTerm ? userManager.searchPlayers(searchTerm) : userManager.players;

    const totalRecords = userManager.players.reduce((sum, p) => sum + p.recordsCount, 0);
    document.getElementById('totalPlayers').textContent = userManager.players.length;
    document.getElementById('totalRecords').textContent = totalRecords;

    if (players.length === 0) {
        container.innerHTML = '<p class="no-data">Aucun joueur trouvé</p>';
        return;
    }

    container.innerHTML = players.map(player => `
        <div class="player-card">
            <div class="player-card-header">
                <h3>🎮 ${escapeHtml(player.name)}</h3>
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

// === AFFICHAGE VÉRIFICATEURS ===
function renderVerifiersList(searchTerm = '') {
    userManager.loadVerifiers();
    const container = document.getElementById('verifiersList');
    const verifiers = searchTerm ? userManager.searchVerifiers(searchTerm) : userManager.verifiers;

    const totalLevels = userManager.verifiers.reduce((sum, v) => sum + v.levelsVerified, 0);
    document.getElementById('totalVerifiers').textContent = userManager.verifiers.length;
    document.getElementById('totalVerified').textContent = totalLevels;

    if (verifiers.length === 0) {
        container.innerHTML = '<p class="no-data">Aucun vérificateur trouvé</p>';
        return;
    }

    container.innerHTML = verifiers.map(verifier => `
        <div class="player-card">
            <div class="player-card-header">
                <h3>✔️ ${escapeHtml(verifier.name)}</h3>
                ${verifier.country ? `<span class="player-country">${escapeHtml(verifier.country)}${verifier.region ? ` - ${escapeHtml(verifier.region)}` : ''}</span>` : ''}
            </div>
            
            <div class="player-stats-grid">
                <div class="stat-item-small">
                    <div class="stat-label-small">Niveaux</div>
                    <div class="stat-value-small">${verifier.levelsVerified}</div>
                </div>
                <div class="stat-item-small">
                    <div class="stat-label-small">Points</div>
                    <div class="stat-value-small">${verifier.totalPoints}</div>
                </div>
                <div class="stat-item-small">
                    <div class="stat-label-small">Moy. pts</div>
                    <div class="stat-value-small">${Math.round(verifier.totalPoints / verifier.levelsVerified)}</div>
                </div>
            </div>

            <div class="verifier-levels-preview">
                <strong>Niveaux vérifiés:</strong>
                ${verifier.levels.slice(0, 3).map(level => `
                    <div class="level-preview">• ${escapeHtml(level.levelName)} (#${level.rank})</div>
                `).join('')}
                ${verifier.levels.length > 3 ? `<div class="more-levels">+${verifier.levels.length - 3} autre${verifier.levels.length - 3 > 1 ? 's' : ''}</div>` : ''}
            </div>

            <div class="player-actions">
                <button class="btn-secondary" onclick="editVerifier('${escapeHtml(verifier.name)}')">✏️ Modifier</button>
                <button class="btn-delete" onclick="deleteVerifier('${escapeHtml(verifier.name)}')">🗑️ Supprimer</button>
            </div>
        </div>
    `).join('');
}

// === ÉDITION JOUEUR ===
function editPlayer(playerName) {
    const player = userManager.players.find(p => p.name === playerName);
    if (!player) return;

    const newName = prompt('Nouveau nom du joueur:', playerName);
    if (!newName || newName === playerName) return;

    if (userManager.players.some(p => p.name.toLowerCase() === newName.toLowerCase() && p.name !== playerName)) {
        alert('❌ Ce nom de joueur existe déjà');
        return;
    }

    const newCountry = prompt('Pays:', player.country);
    const newRegion = prompt('Région:', player.region);

    userManager.updatePlayer(playerName, {
        name: newName,
        country: newCountry || '',
        region: newRegion || ''
    });

    renderPlayersList();
    alert(`✅ Joueur "${playerName}" modifié en "${newName}"`);
}

// === SUPPRESSION JOUEUR ===
function deletePlayer(playerName) {
    if (!confirm(`❓ Êtes-vous sûr de vouloir supprimer le joueur "${playerName}" et tous ses records ?`)) {
        return;
    }

    userManager.deletePlayer(playerName);
    renderPlayersList();
    alert(`✅ Joueur "${playerName}" supprimé`);
}

// === ÉDITION VÉRIFICATEUR ===
function editVerifier(verifierName) {
    const verifier = userManager.verifiers.find(v => v.name === verifierName);
    if (!verifier) return;

    const newName = prompt('Nouveau nom du vérificateur:', verifierName);
    if (!newName || newName === verifierName) return;

    if (userManager.verifiers.some(v => v.name.toLowerCase() === newName.toLowerCase() && v.name !== verifierName)) {
        alert('❌ Ce nom de vérificateur existe déjà');
        return;
    }

    const newCountry = prompt('Pays:', verifier.country);
    const newRegion = prompt('Région:', verifier.region);

    userManager.updateVerifier(verifierName, {
        name: newName,
        country: newCountry || '',
        region: newRegion || ''
    });

    renderVerifiersList();
    alert(`✅ Vérificateur "${verifierName}" modifié en "${newName}"`);
}

// === SUPPRESSION VÉRIFICATEUR ===
function deleteVerifier(verifierName) {
    if (!confirm(`❓ Êtes-vous sûr de vouloir supprimer le vérificateur "${verifierName}" et tous ses niveaux vérifiés ?`)) {
        return;
    }

    userManager.deleteVerifier(verifierName);
    renderVerifiersList();
    alert(`✅ Vérificateur "${verifierName}" supprimé`);
}

// === FONCTION UTILITAIRE ===
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
