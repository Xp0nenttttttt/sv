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

        // Précharger les données
        await universalStorage.getData('svChallengeSubmissions');
        await universalStorage.getData('svChallengeRecordSubmissions');

        const data = await fetchAccountData(username);
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
async function fetchAccountData(username) {
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

    const submissions =
        await universalStorage.getData('svChallengeSubmissions') || [];

    // ✅ Niveaux créés ACCEPTÉS uniquement
    const allLevels =
        await universalStorage.getData('svChallengeSubmissions') || [];

    // On garde seulement les niveaux acceptés
    const acceptedLevels = allLevels.filter(lvl =>
        lvl.status === 'accepted'
    );
    const createdLevels = acceptedLevels.filter(lvl =>
        lvl.creator &&
        lvl.creator.toLowerCase() === username.toLowerCase()
    ).map(lvl => ({
        levelId: lvl.id,
        levelName: lvl.name || lvl.levelName,
        rank: lvl.rank
    }));


    // ✅ Niveaux battus
    const beatenLevels = player?.records
        ? player.records.map(r => {
            const level = acceptedLevels.find(l => l.id === r.levelId);
            return {
                levelId: r.levelId,
                levelName: level?.name || r.levelName || 'Niveau inconnu',
                rank: r.rank,
                points: r.points,
                percentage: r.percentage
            };
        })
        : [];



    // ✅ Niveaux vérifiés
    const verifiedLevels = verifier?.levels
        ? verifier.levels.map(v => {
            const level = acceptedLevels.find(l => l.id === v.levelId);
            return {
                levelId: v.levelId,
                levelName: level?.name || 'Niveau inconnu',
                rank: v.rank,
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

    document.getElementById('account-title').textContent = `Compte : ${username}`;

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

    renderList('created-levels-list', createdLevels,
        l => `${l.levelName} (Rank ${l.approvedRank || '-'})`,
        'Aucun niveau créé'
    );

    renderList('beaten-levels-list', beatenLevels,
        r => `${r.levelName} (Rank ${r.rank}) - ${r.points} pts - ${r.percentage}%`,
        'Aucun niveau battu'
    );

    renderList('verifications-list', verifiedLevels,
        l => `${l.levelName} (Rank ${l.rank}) - ${l.points} pts`,
        'Aucun niveau vérifié'
    );
}

// ──────────────────────────────
// Helper render
function renderList(id, items, formatter, emptyText) {
    const el = document.getElementById(id);
    el.innerHTML = '';

    if (items.length === 0) {
        el.innerHTML = `<li>${emptyText}</li>`;
        return;
    }

    items.forEach(item => {
        el.innerHTML += `<li>${formatter(item)}</li>`;
    });
}
