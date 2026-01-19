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
        acceptedAt: row.accepted_at || row.acceptedAt,
        verifier: row.author_name || null
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
                    badge: submission.badge || null,
                    verifier: submission.authorName || null
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
                badge: submission.badge || null,
                verifier: submission.authorName || null
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
                badge: submission.badge || null,
                verifier: submission.authorName || null
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
            badge: submission.badge || null,
            verifier: submission.authorName || null
        };
    });

    return [...levels, ...submittedLevels].sort((a, b) => a.rank - b.rank);
}

// Récupérer les éléments du DOM
const levelsList = document.getElementById('levelsList');
const difficultyFilter = document.getElementById('difficulty-filter');
const lengthFilter = document.getElementById('length-filter');
const tagFilter = document.getElementById('tag-filter');
const searchInput = document.getElementById('search-input');
const levelCountElement = document.getElementById('levelCount');
const recordCountElement = document.getElementById('recordCount');

// Met à jour le compteur de records acceptés
async function updateRecordCount() {
    if (!recordCountElement) return;

    try {
        // S'assurer que le stockage est prêt
        if (typeof initializeSupabaseStorage === 'function' && !universalStorage) {
            await initializeSupabaseStorage();
        }

        let attempts = 0;
        while (!universalStorage && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        let acceptedCount = 0;

        if (universalStorage && typeof universalStorage.getData === 'function') {
            const allRecords = await universalStorage.getData('svChallengeRecordSubmissions') || [];
            acceptedCount = allRecords.filter(r => r.status === 'accepted').length;
        } else if (typeof dataSyncManager !== 'undefined' && typeof dataSyncManager.loadRecords === 'function') {
            const syncRecords = await dataSyncManager.loadRecords();
            acceptedCount = (syncRecords || []).filter(r => r.status === 'accepted').length;
        }

        recordCountElement.textContent = acceptedCount;
    } catch (err) {
        console.error('Erreur mise à jour du compteur de records:', err);
    }
}

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
        .toLowerCase()
        .trim();

    // Test strict pour éviter les confusions (extreme avant hard, insane avant difficile)
    const key = normalized.includes('extreme') ? 'extreme'
        : normalized.includes('insane') || normalized.includes('tres difficile') ? 'insane'
            : normalized.includes('hard') || (normalized.includes('difficile') && !normalized.includes('tres')) ? 'hard'
                : normalized.includes('medium') || normalized.includes('moyen') ? 'medium'
                    : 'easy';

    const filename = {
        extreme: 'extreme.webp',
        insane: 'insane.png',
        hard: 'hard.webp',
        medium: 'medium.webp',
        easy: 'easy.webp'
    }[key] || 'easy.webp';

    let file = filename;
    const badgeLower = (badge || '').toLowerCase();
    if (badgeLower === 'mythic') {
        const parts = filename.split('.');
        parts.pop(); // Remove extension
        file = parts.join('.') + '_mythic.png'; // Force .png for mythic variants
    } else if (badgeLower === 'legendary') {
        const parts = filename.split('.');
        parts.pop(); // Remove extension
        file = parts.join('.') + '_legendary.png'; // Force .png for legendary variants
    }

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
    };
    return mapping[badge] || null;
}

// Fonction pour afficher les niveaux
function renderLevels(filteredLevels) {
    levelsList.innerHTML = '';

    filteredLevels.forEach(level => {
        const levelCard = document.createElement('div');

        const badge = getBadgeGif(level.badge);
        const difficultyIcon = getDifficultyIcon(level.difficulty, level.badge);
        const rankNumber = Number(level.rank); // normalise pour éviter les chaînes "1"

        let cardClass = 'level-card';

        if (rankNumber === 1) {
            cardClass += ' top-1 top-1-rank';
        } else {
            cardClass += ' difficulty-' + difficultyIcon.key;
            if (rankNumber === 2 || rankNumber === 3) {
                cardClass += ' top-2-3';
            } else if (rankNumber === 4 || rankNumber === 5) {
                cardClass += ' top-4-5';
            }
        }

        levelCard.className = cardClass;

        const imageHTML = level.image ? `<img src="${level.image}" alt="${level.name}" class="level-image">` : '';

        let rankDisplay = '#' + rankNumber;
        let containerClass = 'level-container';
        let topParticles = '';

        if (rankNumber === 1) {
            rankDisplay = '#' + rankNumber;
            containerClass = 'top-1-container';
            topParticles = '<canvas class="badge-canvas top-rank-canvas" data-top-rank="top1" width="160" height="160"></canvas>';
        }
        else if (rankNumber === 2) {
            topParticles = '<canvas class="badge-canvas top-rank-canvas" data-top-rank="top2" width="160" height="160"></canvas>';
        }
        else if (rankNumber === 3) {
            topParticles = '<canvas class="badge-canvas top-rank-canvas" data-top-rank="top3" width="160" height="160"></canvas>';
        }

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
                    <div class="tags-points-row">
                        ${level.tags && level.tags.length > 0 ? `
                            <div class="level-tags">
                                ${level.tags.map(tag => `<span class="tag-badge ${tag}">${getTagEmoji(tag)} ${tag}</span>`).join('')}
                            </div>
                        ` : '<div class="level-tags"></div>'}
                        <div class="points-chip">${level.points} pts</div>
                    </div>
                    <div class="level-details">
                        <div><strong>Créateur:</strong> ${level.creator}</div>
                        ${level.verifier ? `<div><strong>Verifier:</strong> ${level.verifier}</div>` : ''}
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
    const tag = tagFilter ? tagFilter.value : '';
    const searchTerm = searchInput.value.toLowerCase();

    console.log('Filtrage:', { difficulty, length, tag, searchTerm });

    const filtered = allLevels.filter(level => {
        const matchDifficulty = !difficulty || level.difficulty === difficulty;
        const matchLength = !length || level.length === length;
        const matchTag = !tag || (level.tags && level.tags.includes(tag));
        const matchSearch = !searchTerm ||
            level.name.toLowerCase().includes(searchTerm) ||
            level.creator.toLowerCase().includes(searchTerm);

        if (tag && matchTag) {
            console.log('Niveau avec tag:', level.name, level.tags);
        }

        return matchDifficulty && matchLength && matchTag && matchSearch;
    });

    console.log('Niveaux filtrés:', filtered.length);
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
tagFilter.addEventListener('change', filterLevels);
searchInput.addEventListener('input', filterLevels);

// Fonction pour obtenir l'emoji du tag
function getTagEmoji(tag) {
    const emojis = {
        wave: '🌊',
        ship: '🚀',
        overall: '🏄',
        timing: '⏱️',
        vitesse: '⚡',
        nong: '🎵',
    };
    return emojis[tag] || '🏷️';
}

// Affichage initial avec les niveaux chargés
let allLevels = [];

async function initializeLevels() {
    allLevels = await loadAllLevels();
    // Normaliser tous les niveaux pour avoir les champs requis
    allLevels = allLevels.map(level => ({
        ...level,
        verifier: level.verifier || null
    }));
    console.log('✅ Niveaux chargés:', allLevels.length, allLevels.slice(0, 2));
    allLevels = await loadAllLevels();
    renderLevels(allLevels);
    filterLevels();

    // Mettre à jour le compteur de records
    await updateRecordCount();
}


// Charger le meilleur clan
async function loadTopClan() {
    console.log('🛡️ Chargement du meilleur clan...');
    try {
        // Attendre que supabaseClient soit disponible
        let attempts = 0;
        while (typeof supabaseClient === 'undefined' && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (typeof supabaseClient === 'undefined') {
            console.log('❌ supabaseClient non disponible');
            return;
        }

        console.log('✅ supabaseClient disponible');

        // Initialiser le stockage
        if (typeof initializeSupabaseStorage === 'function' && !universalStorage) {
            await initializeSupabaseStorage();
        }

        // Attendre universalStorage
        let storageAttempts = 0;
        while (!universalStorage && storageAttempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            storageAttempts++;
        }

        if (!universalStorage) {
            console.log('❌ universalStorage non disponible');
            return;
        }

        console.log('✅ universalStorage disponible');

        // Récupérer tous les clans
        const { data: clans } = await supabaseClient.from('clans').select('*');
        console.log('📋 Clans trouvés:', clans?.length || 0);
        if (!clans || clans.length === 0) return;

        const allRecords = await universalStorage.getData('svChallengeRecordSubmissions') || [];
        console.log('📊 Records chargés:', allRecords.length);
        const allLevels = await universalStorage.getData('svChallengeSubmissions') || [];

        // Calculer les stats
        let topClan = null;
        let maxPoints = 0;

        for (const clan of clans) {
            const { data: members } = await supabaseClient
                .from('clan_members')
                .select('user_id')
                .eq('clan_id', clan.id);

            if (!members || members.length === 0) continue;

            const memberIds = members.map(m => m.user_id);
            const { data: profiles } = await supabaseClient
                .from('profiles')
                .select('id, username')
                .in('id', memberIds);

            const memberUsernames = profiles ? profiles.map(p => p.username) : [];
            const clanRecords = allRecords.filter(r => r.status === 'accepted' && memberUsernames.includes(r.player));

            const levelPointsMap = {};
            clanRecords.forEach(record => {
                if (!levelPointsMap[record.levelId]) {
                    const level = allLevels.find(l => String(l.id) === String(record.levelId));
                    let points = 0;
                    if (level && level.approvedRank) {
                        const rank = level.approvedRank;
                        if (rank === 1) points = 150;
                        else if (rank <= 10) points = 150 - (rank - 1) * 5;
                        else if (rank <= 50) points = 100 - (rank - 10) * 2;
                        else if (rank <= 100) points = 20 - Math.floor((rank - 50) / 10);
                        else points = 10;
                    }
                    levelPointsMap[record.levelId] = points;
                }
            });

            let totalPoints = 0;
            Object.values(levelPointsMap).forEach(points => totalPoints += points);

            const clanLevels = allLevels.filter(l => l.status === 'accepted' && memberUsernames.includes(l.authorName));
            clanLevels.forEach(level => {
                if (level.approvedRank) {
                    const rank = level.approvedRank;
                    let points = 0;
                    if (rank === 1) points = 150;
                    else if (rank <= 10) points = 150 - (rank - 1) * 5;
                    else if (rank <= 50) points = 100 - (rank - 10) * 2;
                    else if (rank <= 100) points = 20 - Math.floor((rank - 50) / 10);
                    else points = 10;
                    totalPoints += points;
                }
            });

            if (totalPoints > maxPoints) {
                maxPoints = totalPoints;
                topClan = {
                    name: clan.name,
                    tag: clan.tag,
                    points: totalPoints,
                    members: memberUsernames.length,
                    records: clanRecords.length,
                    id: clan.id
                };
            }
        }

        if (topClan) {
            console.log('🏆 Meilleur clan trouvé:', topClan);
            document.getElementById('topClanCard').style.display = 'block';
            document.getElementById('topClanName').textContent = `${topClan.tag ? `[${topClan.tag}] ` : ''}${topClan.name}`;
            document.getElementById('topClanStats').innerHTML = `
                <span>🔥 Points : <strong>${topClan.points}</strong></span>
                <span>👥 Membres : <strong>${topClan.members}</strong></span>
                <span>🏆 Records : <strong>${topClan.records}</strong></span>
            `;
            document.getElementById('topClanCard').onclick = () => window.location.href = `clan.html?id=${topClan.id}`;
            document.getElementById('topClanCard').style.cursor = 'pointer';
        } else {
            console.log('❌ Aucun clan trouvé avec des points');
        }
    } catch (error) {
        console.error('Erreur chargement meilleur clan:', error);
    }
}

// Charger le meilleur clan au démarrage
if (document.getElementById('topClanCard')) {
    loadTopClan();
}

// Charger le meilleur joueur
async function loadTopPlayer() {
    console.log('⭐ Chargement du meilleur joueur...');
    try {
        // Attendre que supabaseClient soit disponible
        let attempts = 0;
        while (typeof supabaseClient === 'undefined' && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (typeof supabaseClient === 'undefined') {
            console.log('❌ supabaseClient non disponible');
            return;
        }

        // Initialiser le stockage
        if (typeof initializeSupabaseStorage === 'function' && !universalStorage) {
            await initializeSupabaseStorage();
        }

        // Attendre universalStorage
        let storageAttempts = 0;
        while (!universalStorage && storageAttempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            storageAttempts++;
        }

        if (!universalStorage) {
            console.log('❌ universalStorage non disponible');
            return;
        }

        console.log('✅ Chargement des données du leaderboard...');

        const allRecords = await universalStorage.getData('svChallengeRecordSubmissions') || [];
        const allLevels = await universalStorage.getData('svChallengeSubmissions') || [];

        // Calculer les stats des joueurs
        const playerStats = {};

        // Records complétés
        allRecords.filter(r => r.status === 'accepted').forEach(record => {
            if (!playerStats[record.player]) {
                playerStats[record.player] = { name: record.player, points: 0, levels: new Set(), records: 0 };
            }

            const level = allLevels.find(l => String(l.id) === String(record.levelId));
            if (level && level.approvedRank && !playerStats[record.player].levels.has(record.levelId)) {
                const rank = level.approvedRank;
                let points = 0;
                if (rank === 1) points = 150;
                else if (rank <= 10) points = 150 - (rank - 1) * 5;
                else if (rank <= 50) points = 100 - (rank - 10) * 2;
                else if (rank <= 100) points = 20 - Math.floor((rank - 50) / 10);
                else points = 10;

                playerStats[record.player].points += points;
                playerStats[record.player].levels.add(record.levelId);
            }
            playerStats[record.player].records++;
        });

        // Niveaux vérifiés
        allLevels.filter(l => l.status === 'accepted').forEach(level => {
            if (!playerStats[level.authorName]) {
                playerStats[level.authorName] = { name: level.authorName, points: 0, levels: new Set(), records: 0 };
            }

            if (level.approvedRank) {
                const rank = level.approvedRank;
                let points = 0;
                if (rank === 1) points = 150;
                else if (rank <= 10) points = 150 - (rank - 1) * 5;
                else if (rank <= 50) points = 100 - (rank - 10) * 2;
                else if (rank <= 100) points = 20 - Math.floor((rank - 50) / 10);
                else points = 10;

                playerStats[level.authorName].points += points;
            }
        });

        // Trouver le meilleur joueur
        let topPlayer = null;
        let maxPoints = 0;

        Object.values(playerStats).forEach(player => {
            if (player.points > maxPoints) {
                maxPoints = player.points;
                topPlayer = player;
            }
        });

        if (topPlayer) {
            console.log('🏆 Meilleur joueur trouvé:', topPlayer);
            document.getElementById('topPlayerCard').style.display = 'block';
            document.getElementById('topPlayerName').textContent = topPlayer.name;
            document.getElementById('topPlayerStats').innerHTML = `
                <span>🔥 Points : <strong>${topPlayer.points}</strong></span>
                <span>🎯 Niveaux : <strong>${topPlayer.levels.size}</strong></span>
                <span>🏆 Records : <strong>${topPlayer.records}</strong></span>
            `;
            document.getElementById('topPlayerCard').onclick = () => window.location.href = 'leaderboard.html';
            document.getElementById('topPlayerCard').style.cursor = 'pointer';
        } else {
            console.log('❌ Aucun joueur trouvé avec des points');
        }
    } catch (error) {
        console.error('Erreur chargement meilleur joueur:', error);
    }
}

// Charger le meilleur joueur au démarrage
if (document.getElementById('topPlayerCard')) {
    loadTopPlayer();
}

