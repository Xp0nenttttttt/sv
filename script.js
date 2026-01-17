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

// Récupérer les niveaux directement depuis Supabase (table public.levels)
async function fetchLevelsFromSupabase() {
    if (typeof SUPABASE_CONFIG === 'undefined' || !SUPABASE_CONFIG.URL || !SUPABASE_CONFIG.KEY) {
        return [];
    }

    const endpoint = `${SUPABASE_CONFIG.URL}/rest/v1/levels` +
        '?select=id,level_name,creator_name,approved_rank,approved_difficulty,length,tags,status,image_url,image_base64,imageUrl,imageBase64,proposed_top,badge,description,submitted_at,accepted_at,author_name';

    try {
        const res = await fetch(endpoint, {
            headers: {
                apikey: SUPABASE_CONFIG.KEY,
                Authorization: `Bearer ${SUPABASE_CONFIG.KEY}`
            }
        });

        if (!res.ok) {
            console.warn('⚠️ Supabase levels fetch failed:', res.status, await res.text());
            return [];
        }

        const rows = await res.json();
        const acceptedRows = Array.isArray(rows) ? rows.filter(r => r.status === 'accepted') : [];
        return acceptedRows.map(mapSupabaseRowToLevel).sort((a, b) => a.rank - b.rank);
    } catch (err) {
        console.warn('⚠️ Supabase levels fetch error:', err.message);
        return [];
    }
}

// Mapper une ligne Supabase vers le format utilisé par le front
function mapSupabaseRowToLevel(row) {
    const rank = row.approved_rank ?? 999;
    return {
        id: String(row.id),
        rank: rank,
        name: row.level_name || 'Niveau',
        creator: row.creator_name || 'Inconnu',
        difficulty: normalizeDifficulty(row.approved_difficulty),
        length: row.length || 'Short',
        points: calculatePoints(rank),
        author: row.author_name || row.creator_name || '',
        image: row.image_url || row.imageUrl || row.image_base64 || row.imageBase64,
        submittedBy: row.author_name || row.creator_name || '',
        isSubmitted: true,
        proposedTop: row.proposed_top || row.proposedTop,
        tags: row.tags || [],
        badge: row.badge || null,
        description: row.description || '',
        submittedAt: row.submitted_at || row.submittedAt,
        acceptedAt: row.accepted_at || row.acceptedAt
    };
}

// Charger les niveaux avec priorité Supabase -> JSON -> localStorage
async function loadAllLevels() {
    // 0) Supabase direct (source officielle)
    const supabaseLevels = await fetchLevelsFromSupabase();
    if (supabaseLevels.length > 0) {
        return supabaseLevels;
    }

    // 1) Supabase via universalStorage (cache ou fetch)
    if (typeof universalStorage !== 'undefined' && typeof universalStorage.getData === 'function') {
        const allSubmissions = await universalStorage.getData('svChallengeSubmissions') || [];
        const acceptedSubmissions = allSubmissions.filter(s => s.status === 'accepted');

        if (acceptedSubmissions.length > 0) {
            const submittedLevels = acceptedSubmissions.map((submission) => {
                const rank = submission.approvedRank || (levels.length + 100);
                return {
                    id: submission.id,
                    rank: rank,
                    name: submission.levelName,
                    creator: submission.creatorName,
                    difficulty: normalizeDifficulty(submission.approvedDifficulty),
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
        const acceptedSubmissions = (await dataSyncManager.loadLevels()).filter(s => s.status === 'accepted');

        const submittedLevels = acceptedSubmissions.map((submission) => {
            const rank = submission.approvedRank || (levels.length + 100);
            return {
                id: submission.id,
                rank: rank,
                name: submission.levelName,
                creator: submission.creatorName,
                difficulty: normalizeDifficulty(submission.approvedDifficulty),
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
                difficulty: normalizeDifficulty(submission.approvedDifficulty),
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
            difficulty: normalizeDifficulty(submission.approvedDifficulty),
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

// Normalise une difficulté vers un libellé canonique
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

// Retourne l'icône de difficulté (fallback sur easy)
function getDifficultyIcon(difficulty, badge) {
    const normalized = (difficulty || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    const key = normalized.includes('extreme') ? 'extreme'
        : normalized.includes('tres difficile') || normalized.includes('très difficile') || normalized.includes('insane') ? 'insane'
            : normalized.includes('difficile') || normalized.includes('hard') ? 'hard'
                : normalized.includes('moyen') || normalized.includes('medium') ? 'medium'
                    : 'easy';

    const filename = {
        extreme: 'extreme.webp',
        insane: 'insane.png',
        hard: 'hard.webp',
        medium: 'medium.webp',
        easy: 'easy.webp'
    }[key] || 'easy.webp';

    const isMythic = (badge || '').toLowerCase() === 'mythic';
    const file = isMythic ? filename.replace(/(\.[a-z0-9]+)$/i, '_mythic$1') : filename;

    return {
        src: `image/${file}`,
        alt: `${difficulty || key} Demon`,
        key
    };
}

function getBadgeGif(badge) {
    if (!badge) return null;
    const mapping = {
        mythic: { src: 'image/mythic.gif', alt: 'Mythic Badge' },
        legendary: { src: 'image/legendary.gif', alt: 'Legendary Badge' },
        epic: { src: 'image/epic.gif', alt: 'Epic Badge' },
        featured: { src: 'image/epic.gif', alt: 'Featured Badge' }
    };
    return mapping[badge] || null;
}

// Fonction pour afficher les niveaux
function renderLevels(filteredLevels) {
    levelsList.innerHTML = '';

    filteredLevels.forEach(level => {
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
        let topParticles = '';

        if (level.rank === 1) {
            rankDisplay = '#' + level.rank;
            containerClass = 'top-1-container';
            topParticles = '<canvas class="badge-canvas top-rank-canvas" data-top-rank="top1" width="160" height="160"></canvas>';
        }
        else if (level.rank === 2) {
            topParticles = '<canvas class="badge-canvas top-rank-canvas" data-top-rank="top2" width="160" height="160"></canvas>';
        }
        else if (level.rank === 3) {
            topParticles = '<canvas class="badge-canvas top-rank-canvas" data-top-rank="top3" width="160" height="160"></canvas>';
        }

        const badge = getBadgeGif(level.badge);
        const difficultyIcon = getDifficultyIcon(level.difficulty, level.badge);

        levelCard.innerHTML = `
            <div class="${containerClass}">
                <div class="image-wrapper">
                    ${topParticles}
                    ${imageHTML}
                </div>
                <div class="level-info">
                    <div class="level-rank">${rankDisplay}</div>
                    <h3>${level.name}</h3>
                    <div class="level-meta">
                        <span class="difficulty-chip difficulty-bg-${difficultyIcon.key}">
                            ${badge ? `<img class="badge-gif badge-gif-chip" src="${badge.src}" alt="${badge.alt}">` : ''}
                            <img src="${difficultyIcon.src}" alt="${difficultyIcon.alt}" class="difficulty-icon">
                        </span>
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

    if (value === 'Extreme Demon') {
        difficultySelect.classList.add('extreme');
    } else if (value === 'Insane Demon') {
        difficultySelect.classList.add('insane');
    } else if (value === 'Hard Demon') {
        difficultySelect.classList.add('hard');
    } else if (value === 'Medium Demon' || value === 'Easy Demon') {
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
