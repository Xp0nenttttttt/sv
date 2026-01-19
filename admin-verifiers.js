// Admin Verifiers Manager

// La vérification admin est désormais faite côté HTML via Supabase Auth
// (voir admin-verifiers.html)

class VerifierManager {
    constructor() {
        this.submissionManager = new SubmissionManager();
        this.leaderboardManager = new LeaderboardManager();
        this.verifiers = [];
        this.loadVerifiers();
    }

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
                    originalName: submission.authorName
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

    updateVerifier(originalName, newData) {
        const allSubmissions = this.submissionManager.getSubmissions();
        const originalKey = originalName.toLowerCase();

        if (newData.name !== originalName) {
            // Renommer le vérificateur dans tous ses niveaux
            allSubmissions.forEach(submission => {
                if (submission.authorName.toLowerCase() === originalKey) {
                    submission.authorName = newData.name;
                }
            });
        }

        // Mettre à jour les informations géographiques
        allSubmissions.forEach(submission => {
            const submissionKey = submission.authorName.toLowerCase();
            const originalLowerCase = originalName.toLowerCase();

            if (submissionKey === originalLowerCase || submission.authorName === newData.name) {
                submission.playerCountry = newData.country;
                submission.playerRegion = newData.region;
            }
        });

        localStorage.setItem(this.submissionManager.storageKey, JSON.stringify(allSubmissions));
        this.loadVerifiers();
    }

    deleteVerifier(verifierName) {
        const allSubmissions = this.submissionManager.getSubmissions();
        // Marquer les niveaux vérifiés comme rejetés
        const filtered = allSubmissions.filter(submission => submission.authorName.toLowerCase() !== verifierName.toLowerCase());
        localStorage.setItem(this.submissionManager.storageKey, JSON.stringify(filtered));
        this.loadVerifiers();
    }

    searchVerifiers(term) {
        if (!term) return this.verifiers;
        return this.verifiers.filter(verifier =>
            verifier.name.toLowerCase().includes(term.toLowerCase()) ||
            verifier.country.toLowerCase().includes(term.toLowerCase())
        );
    }
}

let verifierManager = new VerifierManager();

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('verifiersLoginForm');
    loginForm.addEventListener('submit', handleVerifiersLogin);
});

function handleVerifiersLogin(event) {
    event.preventDefault();
    const password = document.getElementById('verifiersPassword').value;
    const loginError = document.getElementById('loginError');

    if (password === ADMIN_PASSWORD) {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('verifiersSection').classList.remove('hidden');
        renderVerifiersList();
    } else {
        loginError.textContent = '❌ Mot de passe incorrect';
        loginError.classList.remove('hidden');
    }
}

function renderVerifiersList() {
    verifierManager.loadVerifiers();
    const container = document.getElementById('verifiersList');
    const verifiers = verifierManager.verifiers;

    // Mettre à jour les stats
    const totalLevels = verifiers.reduce((sum, v) => sum + v.levelsVerified, 0);
    document.getElementById('totalVerifiers').textContent = verifiers.length;
    document.getElementById('totalVerified').textContent = totalLevels;

    if (verifiers.length === 0) {
        container.innerHTML = '<p class="no-data">Aucun vérificateur trouvé</p>';
        return;
    }

    container.innerHTML = verifiers.map(verifier => `
        <div class="player-card">
            <div class="player-card-header">
                <h3>${escapeHtml(verifier.name)}</h3>
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

function editVerifier(verifierName) {
    const verifier = verifierManager.verifiers.find(v => v.name === verifierName);
    if (!verifier) return;

    const newName = prompt('Nouveau nom du vérificateur:', verifierName);
    if (!newName || newName === verifierName) return;

    // Vérifier que le nouveau nom n'existe pas
    if (verifierManager.verifiers.some(v => v.name.toLowerCase() === newName.toLowerCase() && v.name !== verifierName)) {
        alert('❌ Ce nom de vérificateur existe déjà');
        return;
    }

    const newCountry = prompt('Pays:', verifier.country);
    const newRegion = prompt('Région:', verifier.region);

    verifierManager.updateVerifier(verifierName, {
        name: newName,
        country: newCountry || '',
        region: newRegion || ''
    });

    renderVerifiersList();
    alert(`✅ Vérificateur "${verifierName}" modifié en "${newName}"`);
}

function deleteVerifier(verifierName) {
    if (!confirm(`❓ Êtes-vous sûr de vouloir supprimer le vérificateur "${verifierName}" et tous ses niveaux vérifiés ?`)) {
        return;
    }

    verifierManager.deleteVerifier(verifierName);
    renderVerifiersList();
    alert(`✅ Vérificateur "${verifierName}" supprimé`);
}

// Gestion de la recherche
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchVerifier');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const results = verifierManager.searchVerifiers(e.target.value);
            const container = document.getElementById('verifiersList');

            if (results.length === 0) {
                container.innerHTML = '<p class="no-data">Aucun vérificateur trouvé</p>';
                return;
            }

            container.innerHTML = results.map(verifier => `
                <div class="player-card">
                    <div class="player-card-header">
                        <h3>${escapeHtml(verifier.name)}</h3>
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
