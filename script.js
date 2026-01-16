// Données des niveaux - À personnaliser avec tes données réelles
const levels = [

];

// Fonction pour calculer les points selon le rang
function calculatePoints(rank) {
    if (rank === 1) return 150; // Top 1 = 150 points fixes
    if (rank <= 10) return 150 - (rank - 1) * 5; // Top 2-10: 145, 140, 135...
    if (rank <= 50) return 100 - (rank - 10) * 2; // Top 11-50
    if (rank <= 100) return 20 - Math.floor((rank - 50) / 10); // Top 51-100
    return 10; // Au-delà du top 100
}

// Charger les niveaux avec priorité Supabase -> JSON -> localStorage
async function loadAllLevels() {
    // 1) Supabase via universalStorage (cache ou fetch)
    if (typeof universalStorage !== 'undefined' && typeof universalStorage.getData === 'function') {
        const acceptedSubmissions = await universalStorage.getData('svChallengeSubmissions') || [];

        if (acceptedSubmissions.length > 0) {
            const submittedLevels = acceptedSubmissions.map((submission) => {
                const rank = submission.approvedRank || (levels.length + 100);
                return {
                    id: submission.id,
                    rank: rank,
                    name: submission.levelName,
                    creator: submission.creatorName,
                    difficulty: submission.approvedDifficulty || 'Moyen',
                    length: submission.length,
                    points: calculatePoints(rank),
                    author: submission.authorName,
                    image: submission.imageBase64 || submission.imageUrl,
                    submittedBy: submission.authorName,
                    isSubmitted: true,
                    proposedTop: submission.proposedTop,
                    tags: submission.tags || [],
                    badge: submission.badge || null
                };
            });

            return [...levels, ...submittedLevels].sort((a, b) => a.rank - b.rank);
        }
    }

    // 2) JSON data (fallback multi-PC hors Supabase)
    if (typeof dataSyncManager !== 'undefined') {
        const acceptedSubmissions = await dataSyncManager.loadLevels();

        const submittedLevels = acceptedSubmissions.map((submission) => {
            const rank = submission.approvedRank || (levels.length + 100);
            return {
                id: submission.id,
                rank: rank,
                name: submission.levelName,
                creator: submission.creatorName,
                difficulty: submission.approvedDifficulty || 'Moyen',
                length: submission.length,
                points: calculatePoints(rank),
                author: submission.authorName,
                image: submission.imageBase64 || submission.imageUrl,
                submittedBy: submission.authorName,
                isSubmitted: true,
                proposedTop: submission.proposedTop,
                tags: submission.tags || [],
                badge: submission.badge || null
            };
        });

        if (submittedLevels.length > 0) {
            return [...levels, ...submittedLevels].sort((a, b) => a.rank - b.rank);
        }
    }

    // 3) Fallback localStorage direct
    if (typeof SubmissionManager !== 'undefined') {
        const manager = new SubmissionManager();
        const acceptedSubmissions = manager.getAcceptedSubmissions();

        const submittedLevels = acceptedSubmissions.map((submission) => {
            const rank = submission.approvedRank || (levels.length + 100);
            return {
                id: submission.id,
                rank: rank,
                name: submission.levelName,
                creator: submission.creatorName,
                difficulty: submission.approvedDifficulty || 'Moyen',
                length: submission.length,
                points: calculatePoints(rank),
                author: submission.authorName,
                image: submission.imageBase64 || submission.imageUrl,
                submittedBy: submission.authorName,
                isSubmitted: true,
                proposedTop: submission.proposedTop,
                tags: submission.tags || [],
                badge: submission.badge || null
            };
        });

        return [...levels, ...submittedLevels].sort((a, b) => a.rank - b.rank);
    }

    // Fallback: utiliser l'adaptateur universel si SubmissionManager n'est pas présent
    const submissionManagerStandalone = {
        storageKey: 'svChallengeSubmissions',
        getAcceptedSubmissions: async function () {
            const data = await universalStorage.getData(this.storageKey);
            const submissions = data || [];
            return submissions.filter(s => s.status === 'accepted');
        }
    };

    const acceptedSubmissions = await submissionManagerStandalone.getAcceptedSubmissions();

    const submittedLevels = acceptedSubmissions.map((submission) => {
        const rank = submission.approvedRank || (levels.length + 100);
        return {
            id: submission.id,
            rank: rank,
            name: submission.levelName,
            creator: submission.creatorName,
            difficulty: submission.approvedDifficulty || 'Moyen',
            length: submission.length,
            points: calculatePoints(rank),
            author: submission.authorName,
            image: submission.imageBase64 || submission.imageUrl,
            submittedBy: submission.authorName,
            isSubmitted: true,
            proposedTop: submission.proposedTop,
            tags: submission.tags || [],
            badge: submission.badge || null
        };
    });

    return [...levels, ...submittedLevels].sort((a, b) => a.rank - b.rank);
}

// Récupérer les éléments du DOM
const levelsList = document.getElementById('levelsList');
const difficultyFilter = document.getElementById('difficulty-filter');

const lengthFilter = document.getElementById('length-filter');
const searchInput = document.getElementById('search-input');
const levelCountElement = document.getElementById('levelCount');
const recordCountElement = document.getElementById('recordCount');

// Fonction pour afficher les niveaux
function renderLevels(filteredLevels) {
    levelsList.innerHTML = '';

    filteredLevels.forEach(level => {
        const difficultyClass = `difficulty-${level.difficulty.toLowerCase()}`;
        const levelCard = document.createElement('div');
        let cardClass = 'level-card';

        if (level.rank === 1) {
            cardClass += ' top-1';
        } else if (level.rank === 2 || level.rank === 3) {
            cardClass += ' top-2-3';
        } else if (level.rank === 4 || level.rank === 5) {
            cardClass += ' top-4-5';
        }

        levelCard.className = cardClass;

        const imageHTML = level.image ? `<img src="${level.image}" alt="${level.name}" class="level-image">` : '';

        let rankDisplay = '#' + level.rank;
        let containerClass = 'level-container';

        if (level.rank === 1) {
            rankDisplay = '#' + level.rank;
            containerClass = 'top-1-container';
        }

        const badgeHTML = level.badge ? `<canvas class="badge-canvas level-badge" data-badge-type="${level.badge}" width="160" height="160"></canvas>` : '';

        levelCard.innerHTML = `
            <div class="${containerClass}">
                <div class="image-wrapper">
                    ${badgeHTML}
                    ${imageHTML}
                </div>
                <div class="level-info">
                    <div class="level-rank">${rankDisplay}</div>
                    <h3>${level.name}</h3>
                    <div class="level-meta">
                        <span class="${difficultyClass}">${level.difficulty} Demon</span>
                        <span>${level.length}</span>
                    </div>
                    ${level.tags && level.tags.length > 0 ? `
                        <div class="level-tags">
                            ${level.tags.map(tag => `<span class="tag-badge ${tag}">${getTagEmoji(tag)} ${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    <div class="level-details">
                        <div><strong>Créateur:</strong> ${level.creator}</div>
                        <div><strong>Points:</strong> <span class="points">${level.points}</span> pts</div>
                    </div>
                </div>
            </div>
        `;

        // Rendre la carte cliquable
        levelCard.style.cursor = 'pointer';
        levelCard.addEventListener('click', () => {
            window.location.href = `level-details.html?id=${level.id}`;
        });

        levelsList.appendChild(levelCard);
    });

    // Mettre à jour les stats
    levelCountElement.textContent = filteredLevels.length;

    // Initialiser les particules après le rendu
    setTimeout(() => {
        if (typeof initBadgeParticles === 'function') {
            initBadgeParticles();
        }
    }, 100);
}

// Fonction pour filtrer les niveaux
function filterLevels() {
    const difficulty = difficultyFilter.value;
    const length = lengthFilter.value;
    const searchTerm = searchInput.value.toLowerCase();

    const filtered = allLevels.filter(level => {
        const matchDifficulty = !difficulty || level.difficulty === difficulty;
        const matchLength = !length || level.length === length;
        const matchSearch = !searchTerm ||
            level.name.toLowerCase().includes(searchTerm) ||
            level.creator.toLowerCase().includes(searchTerm);

        return matchDifficulty && matchLength && matchSearch;
    });

    renderLevels(filtered);
}

// Fonction pour colorer le select de difficulté
function updateDifficultySelectColor() {
    const difficultySelect = document.getElementById('difficulty-filter');
    difficultySelect.className = ''; // Réinitialiser les classes
    const value = difficultySelect.value;

    if (value === 'Extrême') {
        difficultySelect.classList.add('extreme');
    } else if (value === 'Très Difficile' || value === 'Difficile') {
        difficultySelect.classList.add('hard');
    } else if (value === 'Moyen' || value === 'Facile' || value === 'Très Facile') {
        difficultySelect.classList.add('medium');
    }
}

// Event listeners
difficultyFilter.addEventListener('change', function () {
    filterLevels();
    updateDifficultySelectColor();
});
lengthFilter.addEventListener('change', filterLevels);
searchInput.addEventListener('input', filterLevels);

// Fonction pour obtenir l'emoji du tag
function getTagEmoji(tag) {
    const emojis = {
        wave: '🌊',
        ship: '🚀',
        overall: '🏄',
        timing: '⏱️',
        vitesse: '⚡'
    };
    return emojis[tag] || '🏷️';
}

// Affichage initial avec les niveaux chargés
let allLevels = [];

async function initializeLevels() {
    allLevels = await loadAllLevels();
    renderLevels(allLevels);
    updateDifficultySelectColor();
}

// Ne pas charger automatiquement - sera appelé après activation Supabase
// initializeLevels();

// Ajouter un écouteur pour recharger quand les soumissions changent
window.addEventListener('storage', async function (e) {
    if (e.key === 'svChallengeSubmissions') {
        allLevels = await loadAllLevels();
        renderLevels(allLevels);
        filterLevels();
    }
});
