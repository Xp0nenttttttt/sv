// account-details.js

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const username = getUserFromUrl();
        if (!username) {
            document.body.innerHTML = '<p>Utilisateur non spécifié.</p>';
            return;
        }

        if (typeof enableSupabaseStorage === 'function') {
            await enableSupabaseStorage();
            console.log('✅ Supabase activé (page compte)');
        }

        // Précharger
        const allLevels =
            await universalStorage.getData('svChallengeSubmissions') || [];

        const data = await fetchAccountData(username, allLevels);
        renderAccountDetails(data, username);

    } catch (err) {
        console.error('❌ Erreur chargement compte:', err);
    }
});

// ──────────────────────────────
// Utils
function getUserFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('user');
}

// ──────────────────────────────
// Data
async function fetchAccountData(username, allLevels) {
    const [players, verifiers] = await Promise.all([
        leaderboardManager.getPlayersLeaderboard(),
        leaderboardManager.getVerifiersLeaderboard()
    ]);

    const player = players.find(p =>
        p.name && p.name.toLowerCase() === username.toLowerCase()
    );

    const verifier = verifiers.find(v =>
        v.name && v.name.toLowerCase() === username.toLowerCase()
    );

    // 🔒 niveaux acceptés uniquement
    const acceptedLevels = allLevels.filter(
        lvl => lvl.status === 'accepted'
    );

    // ✅ NIVEAUX CRÉÉS
    const createdLevels = acceptedLevels
        .filter(lvl =>
            lvl.authorName &&
            lvl.authorName.toLowerCase() === username.toLowerCase()
        )
        .map(lvl => ({
            levelId: lvl.id,
            levelName: lvl.levelName,
            rank: lvl.approvedRank,
            difficulty: lvl.approvedDifficulty
        }));

    // ✅ NIVEAUX BATTUS
    const beatenLevels = player?.records
        ? player.records.map(r => {
            const level = acceptedLevels.find(
                l => String(l.id) === String(r.levelId)
            );
            return {
                levelId: r.levelId,
                levelName: level?.levelName || 'Niveau inconnu',
                rank: level?.approvedRank ?? r.rank,
                points: r.points,
                percentage: r.percentage
            };
        })
        : [];

    // ✅ NIVEAUX VÉRIFIÉS
    const verifiedLevels = verifier?.levels
        ? verifier.levels.map(v => {
            const level = acceptedLevels.find(
                l => String(l.id) === String(v.levelId)
            );
            return {
                levelId: v.levelId,
                levelName: level?.levelName || 'Niveau inconnu',
                rank: level?.approvedRank,
                points: v.points
            };
        })
        : [];

    return { player, verifier, createdLevels, beatenLevels, verifiedLevels };
}

// ──────────────────────────────
// Render
function renderAccountDetails(data, username) {
    const { player, verifier, createdLevels, beatenLevels, verifiedLevels } = data;

    document.getElementById('account-title').textContent =
        `Compte : ${username}`;

    const infoDiv = document.getElementById('account-info');
    infoDiv.innerHTML = '';

    if (player) {
        infoDiv.innerHTML += `
            <b>Records :</b> ${player.recordsCount || 0}
            | <b>Points :</b> ${player.totalPoints || 0}<br>
        `;
    }

    if (verifier) {
        infoDiv.innerHTML += `
            <b>Niveaux vérifiés :</b> ${verifier.levelsVerified || 0}
            | <b>Points vérif :</b> ${verifier.totalPoints || 0}<br>
        `;
    }

    renderList(
        'created-levels-list',
        createdLevels,
        l => `${l.levelName} (Top ${l.rank})`,
        'Aucun niveau créé'
    );

    renderList(
        'beaten-levels-list',
        beatenLevels,
        r => `${r.levelName} (Top ${r.rank}) - ${r.points} pts - ${r.percentage}%`,
        'Aucun niveau battu'
    );

    renderList(
        'verifications-list',
        verifiedLevels,
        l => `${l.levelName} (Top ${l.rank}) - ${l.points} pts`,
        'Aucun niveau vérifié'
    );
}

// ──────────────────────────────
// Helper render
function renderList(id, items, formatter, emptyText) {
    const el = document.getElementById(id);
    el.innerHTML = '';

    if (!items || items.length === 0) {
        el.innerHTML = `<li>${emptyText}</li>`;
        return;
    }

    items.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = formatter(item);
        li.classList.add('clickable-level');

        if (item.levelId) {
            li.addEventListener('click', () => {
                window.location.href =
                    `level-details.html?id=${item.levelId}`;
            });
        }

        el.appendChild(li);
    });
}

