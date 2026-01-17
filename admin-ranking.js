// Admin Ranking Manager
const ADMIN_PASSWORD = 'SV2026';

// Normalise une difficulté vers les paliers Demon canoniques
function normalizeDifficulty(rawDifficulty) {
    const normalized = (rawDifficulty || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    if (normalized.includes('extreme')) return 'Extreme Demon';
    if (normalized.includes('tres difficile') || normalized.includes('très difficile') || normalized.includes('insane')) return 'Insane Demon';
    if (normalized.includes('difficile') || normalized.includes('hard')) return 'Hard Demon';
    if (normalized.includes('moyen') || normalized.includes('medium')) return 'Medium Demon';
    return 'Easy Demon';
}

class RankingManager {
    constructor() {
        this.levels = [];
        this.loadLevels();
    }

    async loadLevels() {
        // Charger uniquement les soumissions acceptées depuis Supabase
        const manager = new SubmissionManager();
        const allSubmissions = await manager.getSubmissions();
        const acceptedSubmissions = allSubmissions
            .filter(s => s.status === 'accepted')
            .map(s => {
                const normalizedDifficulty = normalizeDifficulty(s.approvedDifficulty);
                return {
                    id: s.id,
                    name: s.levelName,
                    creator: s.creatorName,
                    author: s.authorName,
                    difficulty: normalizedDifficulty,
                    length: s.length,
                    rank: s.approvedRank || 999,
                    image: s.imageBase64 || s.image,
                    tags: s.tags || [],
                    badge: s.badge || null,
                    isSubmission: true,
                    originalData: {
                        ...s,
                        approvedDifficulty: normalizedDifficulty
                    }
                };
            });

        // Trier par rang
        this.levels = acceptedSubmissions.sort((a, b) => a.rank - b.rank);
    }

    updateRank(levelId, newRank, isSubmission = false) {
        const level = this.levels.find(l => l.id === levelId);
        if (level) {
            level.rank = newRank;

            if (isSubmission && level.originalData) {
                const manager = new SubmissionManager();
                manager.updateSubmissionStatus(levelId, 'accepted', newRank, level.difficulty)
                    .catch(err => console.error('Erreur updateSubmissionStatus:', err));
            }

            this.levels.sort((a, b) => a.rank - b.rank);
        }
    }

    deleteLevel(levelId, isSubmission = false) {
        if (isSubmission) {
            const manager = new SubmissionManager();
            manager.updateSubmissionStatus(levelId, 'rejected', null, null)
                .catch(err => console.error('Erreur updateSubmissionStatus:', err));
        }
        this.levels = this.levels.filter(l => l.id !== levelId);
    }

    updateDifficulty(levelId, newDifficulty, isSubmission = false) {
        const level = this.levels.find(l => l.id === levelId);
        if (level) {
            level.difficulty = newDifficulty;

            if (isSubmission && level.originalData) {
                const manager = new SubmissionManager();
                level.originalData.approvedDifficulty = newDifficulty;
                manager.updateSubmissionStatus(levelId, 'accepted', level.rank, newDifficulty)
                    .catch(err => console.error('Erreur updateSubmissionStatus:', err));
            }
        }
    }

    updateBadge(levelId, badgeType, isSubmission = false) {
        const level = this.levels.find(l => l.id === levelId);
        if (level) {
            level.badge = badgeType; // null, 'epic', 'legendary', ou 'mythic'

            if (isSubmission && level.originalData) {
                const manager = new SubmissionManager();
                manager.getSubmissions().then(submissions => {
                    const idx = submissions.findIndex(s => s.id === levelId);
                    if (idx !== -1) {
                        submissions[idx].badge = badgeType;
                        manager.storageKey && universalStorage &&
                            universalStorage.setData(manager.storageKey, submissions);
                    }
                });
                level.originalData.badge = badgeType;
            }
        }
    }

    updateLength(levelId, length, isSubmission = false) {
        const level = this.levels.find(l => l.id === levelId);
        if (level) {
            level.length = length;

            if (isSubmission && level.originalData) {
                const manager = new SubmissionManager();
                manager.getSubmissions().then(submissions => {
                    const idx = submissions.findIndex(s => s.id === levelId);
                    if (idx !== -1) {
                        submissions[idx].length = length;
                        manager.storageKey && universalStorage &&
                            universalStorage.setData(manager.storageKey, submissions);
                    }
                });
                level.originalData.length = length;
            }
        }
    }

    updateTags(levelId, tags, isSubmission = false) {
        const level = this.levels.find(l => l.id === levelId);
        if (level) {
            level.tags = tags;

            if (isSubmission && level.originalData) {
                const manager = new SubmissionManager();
                manager.getSubmissions().then(submissions => {
                    const idx = submissions.findIndex(s => s.id === levelId);
                    if (idx !== -1) {
                        submissions[idx].tags = tags;
                        manager.storageKey && universalStorage &&
                            universalStorage.setData(manager.storageKey, submissions);
                    }
                });
                level.originalData.tags = tags;
            }
        }
    }
}

let rankingManager = new RankingManager();

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('rankingLoginForm');
    loginForm.addEventListener('submit', handleRankingLogin);

    // Vérifier si déjà connecté
    if (sessionStorage.getItem('rankingAdminSession') === 'active') {
        showRankingPanel();
    }
});

function handleRankingLogin(e) {
    e.preventDefault();
    const password = document.getElementById('rankingPassword').value;
    const errorDiv = document.getElementById('rankingLoginError');

    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('rankingAdminSession', 'active');
        document.getElementById('rankingPassword').value = '';
        errorDiv.classList.add('hidden');
        showRankingPanel();
    } else {
        errorDiv.textContent = '❌ Mot de passe incorrect';
        errorDiv.classList.remove('hidden');
    }
}

function showRankingPanel() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('rankingPanel').classList.remove('hidden');
    renderRankingList();
}

function logoutRanking() {
    sessionStorage.removeItem('rankingAdminSession');
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('rankingPanel').classList.add('hidden');
}

function renderRankingList() {
    rankingManager.loadLevels()
        .then(() => {
            const container = document.getElementById('rankingList');
            const countDiv = document.getElementById('rankingCount');

            container.innerHTML = '';
            countDiv.textContent = rankingManager.levels.length;

            if (rankingManager.levels.length === 0) {
                container.innerHTML = '<p class="no-data">Aucun niveau au classement</p>';
                return;
            }

            rankingManager.levels.forEach(level => {
                const card = createRankingCard(level);
                container.appendChild(card);
            });
        })
        .catch(err => {
            console.error('Erreur chargement niveaux:', err);
        });
}

function createRankingCard(level) {
    const card = document.createElement('div');
    card.className = 'ranking-card';
    card.innerHTML = `
        <div class="ranking-card-header">
            <div class="ranking-position">
                <span class="position-badge">#${level.rank}</span>
            </div>
            <div class="ranking-info">
                <h3>${level.name}</h3>
                <p class="creator-info">Par ${level.author} (Créateur: ${level.creator})</p>
            </div>
            ${level.image ? `
                <img src="${level.image}" alt="${level.name}" class="level-thumbnail">
            ` : ''}
        </div>

        <div class="ranking-details">
            <div class="detail-group">
                <label>Rang</label>
                <input 
                    type="number" 
                    class="rank-input" 
                    value="${level.rank}"
                    min="1"
                    onchange="updateRankingValue(${level.id}, 'rank', this.value, ${level.isSubmission ? 'true' : 'false'})"
                >
            </div>

            <div class="detail-group">
                <label>Difficulté</label>
                <select 
                    class="difficulty-select"
                    onchange="updateRankingValue(${level.id}, 'difficulty', this.value, ${level.isSubmission ? 'true' : 'false'}); updateSelectColor(this);"
                >
                    <option value="Easy Demon" ${level.difficulty === 'Easy Demon' ? 'selected' : ''}>Easy Demon</option>
                    <option value="Medium Demon" ${level.difficulty === 'Medium Demon' ? 'selected' : ''}>Medium Demon</option>
                    <option value="Hard Demon" ${level.difficulty === 'Hard Demon' ? 'selected' : ''}>Hard Demon</option>
                    <option value="Insane Demon" ${level.difficulty === 'Insane Demon' ? 'selected' : ''}>Insane Demon</option>
                    <option value="Extreme Demon" ${level.difficulty === 'Extreme Demon' ? 'selected' : ''}>Extreme Demon</option>
                </select>
            </div>

            <div class="detail-group">
                <label>Badge</label>
                <select 
                    class="badge-select"
                    onchange="updateRankingValue(${level.id}, 'badge', this.value, ${level.isSubmission ? 'true' : 'false'})"
                >
                    <option value="" ${!level.badge ? 'selected' : ''}>Aucun</option>
                    <option value="epic" ${level.badge === 'epic' ? 'selected' : ''}>✦ Epic</option>
                    <option value="legendary" ${level.badge === 'legendary' ? 'selected' : ''}>⭐ Legendary</option>
                    <option value="mythic" ${level.badge === 'mythic' ? 'selected' : ''}>🔥 Mythic</option>
                </select>
            </div>

            <div class="detail-group">
                <label>Longueur</label>
                <select 
                    class="length-select"
                    onchange="updateRankingValue(${level.id}, 'length', this.value, ${level.isSubmission ? 'true' : 'false'})"
                >
                    <option value="Tiny" ${level.length === 'Tiny' ? 'selected' : ''}>Tiny</option>
                    <option value="Short" ${level.length === 'Short' ? 'selected' : ''}>Short</option>
                    <option value="Medium" ${level.length === 'Medium' ? 'selected' : ''}>Medium</option>
                    <option value="Long" ${level.length === 'Long' ? 'selected' : ''}>Long</option>
                    <option value="XL" ${level.length === 'XL' ? 'selected' : ''}>XL</option>
                </select>
            </div>
        </div>

        <div class="tags-editor">
            <label>Tags</label>
            <div class="tags-checkboxes">
                <label class="tag-checkbox">
                    <input type="checkbox" value="wave" ${level.tags && level.tags.includes('wave') ? 'checked' : ''} onchange="updateTags(${level.id}, ${level.isSubmission ? 'true' : 'false'})">
                    <span class="tag-preview wave">🌊 wave</span>
                </label>
                <label class="tag-checkbox">
                    <input type="checkbox" value="ship" ${level.tags && level.tags.includes('ship') ? 'checked' : ''} onchange="updateTags(${level.id}, ${level.isSubmission ? 'true' : 'false'})">
                    <span class="tag-preview ship">🚀 ship</span>
                </label>
                <label class="tag-checkbox">
                    <input type="checkbox" value="overall" ${level.tags && level.tags.includes('overall') ? 'checked' : ''} onchange="updateTags(${level.id}, ${level.isSubmission ? 'true' : 'false'})">
                    <span class="tag-preview overall">🎯 overall</span>
                </label>
                <label class="tag-checkbox">
                    <input type="checkbox" value="timing" ${level.tags && level.tags.includes('timing') ? 'checked' : ''} onchange="updateTags(${level.id}, ${level.isSubmission ? 'true' : 'false'})">
                    <span class="tag-preview timing">⏱️ timing</span>
                </label>
                <label class="tag-checkbox">
                    <input type="checkbox" value="vitesse" ${level.tags && level.tags.includes('vitesse') ? 'checked' : ''} onchange="updateTags(${level.id}, ${level.isSubmission ? 'true' : 'false'})">
                    <span class="tag-preview vitesse">⚡ vitesse</span>
                </label>
            </div>
        </div>

        <div class="ranking-actions">
            <button class="btn-secondary" onclick="moveUp(${level.id}, ${level.isSubmission ? 'true' : 'false'})">
                ⬆️ Monter
            </button>
            <button class="btn-secondary" onclick="moveDown(${level.id}, ${level.isSubmission ? 'true' : 'false'})">
                ⬇️ Descendre
            </button>
            <a href="admin-edit-level.html?id=${level.id}" class="btn-edit">
                ✏️ Modifier
            </a>
            <button class="btn-delete" onclick="removeLevelFromRanking(${level.id}, ${level.isSubmission ? 'true' : 'false'})">
                🗑️ Supprimer
            </button>
        </div>
    `;

    // Colorier le select selon la difficulté
    setTimeout(() => {
        const select = card.querySelector('.difficulty-select');
        updateSelectColor(select);
    }, 0);

    return card;
}

function updateSelectColor(select) {
    const value = select.value;
    select.className = 'difficulty-select';

    if (value === 'Extreme Demon') {
        select.classList.add('extreme');
    } else if (value === 'Insane Demon') {
        select.classList.add('insane');
    } else if (value === 'Hard Demon') {
        select.classList.add('hard');
    } else if (value === 'Medium Demon' || value === 'Easy Demon') {
        select.classList.add('medium');
    }
}

function updateRankingValue(levelId, field, value, isSubmission) {
    if (field === 'rank') {
        rankingManager.updateRank(levelId, parseInt(value), isSubmission);
    } else if (field === 'difficulty') {
        rankingManager.updateDifficulty(levelId, value, isSubmission);
    } else if (field === 'badge') {
        rankingManager.updateBadge(levelId, value || null, isSubmission);
    } else if (field === 'length') {
        rankingManager.updateLength(levelId, value, isSubmission);
    }
    renderRankingList();
}

function updateTags(levelId, isSubmission) {
    const card = event.target.closest('.ranking-card');
    const checkboxes = card.querySelectorAll('.tags-checkboxes input[type="checkbox"]:checked');
    const selectedTags = Array.from(checkboxes).map(cb => cb.value);
    rankingManager.updateTags(levelId, selectedTags, isSubmission);
    renderRankingList();
}

function moveUp(levelId, isSubmission) {
    const level = rankingManager.levels.find(l => l.id === levelId);
    if (level && level.rank > 1) {
        // Trouver le niveau avec le rang juste avant
        const prevLevel = rankingManager.levels.find(l => l.rank === level.rank - 1);
        if (prevLevel) {
            const tempRank = level.rank;
            rankingManager.updateRank(level.id, prevLevel.rank, isSubmission);
            rankingManager.updateRank(prevLevel.id, tempRank, prevLevel.isSubmission);
            renderRankingList();
        }
    }
}

function moveDown(levelId, isSubmission) {
    const level = rankingManager.levels.find(l => l.id === levelId);
    if (level) {
        // Trouver le niveau avec le rang juste après
        const nextLevel = rankingManager.levels.find(l => l.rank === level.rank + 1);
        if (nextLevel) {
            const tempRank = level.rank;
            rankingManager.updateRank(level.id, nextLevel.rank, isSubmission);
            rankingManager.updateRank(nextLevel.id, tempRank, nextLevel.isSubmission);
            renderRankingList();
        }
    }
}

function removeLevelFromRanking(levelId, isSubmission) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce niveau du classement ?')) {
        rankingManager.deleteLevel(levelId, isSubmission);
        renderRankingList();
    }
}
