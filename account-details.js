

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (typeof enableSupabaseStorage === 'function') {
            await enableSupabaseStorage();
            console.log('✅ Supabase activé (page compte)');
        }

        // Précharger les données nécessaires
        await universalStorage.getData('svChallengeSubmissions');
        await universalStorage.getData('svChallengeRecordSubmissions');

        // Maintenant seulement tu charges le compte
        await fetchAccountData();


    } catch (err) {
        console.error('❌ Erreur chargement compte:', err);
    }
});
// account-details.js
// Affiche les infos, records, vérifications et niveaux créés d'un compte

// Récupère le nom d'utilisateur depuis l'URL (?user=...)
function getUserFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('user');
}

async function fetchAccountData(username) {
    // On suppose que leaderboardManager, dataSyncManager, etc. sont déjà chargés
    // Récupère records, vérifications et niveaux créés pour ce compte
    const [players, verifiers] = await Promise.all([
        leaderboardManager.getPlayersLeaderboard(),
        leaderboardManager.getVerifiersLeaderboard()
    ]);

    const player = players.find(p => p.name.toLowerCase() === username.toLowerCase());
    const verifier = verifiers.find(v => v.name.toLowerCase() === username.toLowerCase());
    const createdLevels = submissions.filter(lvl =>
        lvl.creator === username &&
        (
            lvl.status === 'accepted' ||
            lvl.status === 'approved' ||
            lvl.isAccepted === true
        )
    );
    // Niveaux créés (auteur)

    let allLevels = [];
    if (typeof dataSyncManager !== 'undefined' && dataSyncManager.loadLevels) {
        allLevels = await dataSyncManager.loadLevels();
    } else if (typeof universalStorage !== 'undefined' && universalStorage.getData) {
        allLevels = await universalStorage.getData('svChallengeSubmissions') || [];
    }
    createdLevels = allLevels.filter(l => l.authorName && l.authorName.toLowerCase() === username.toLowerCase());

    // Niveaux battus (où il a un record)
    let beatenLevels = [];
    if (player && player.records) {
        beatenLevels = player.records.map(r => ({
            levelName: r.levelName,
            levelId: r.levelId,
            rank: r.rank,
            points: r.points,
            percentage: r.percentage
        }));
    }

    // Niveaux vérifiés (où il est vérificateur)
    let verifiedLevels = [];
    if (verifier && verifier.levels) {
        verifiedLevels = verifier.levels.map(l => ({
            levelName: l.levelName,
            levelId: l.levelId,
            rank: l.rank,
            points: l.points
        }));
    }

    return { player, verifier, createdLevels, beatenLevels, verifiedLevels };
}

function renderAccountDetails({ player, verifier, createdLevels }, username) {
    document.getElementById('account-title').textContent = `Compte : ${username}`;
    const infoDiv = document.getElementById('account-info');
    infoDiv.innerHTML = '';
    if (player) {
        infoDiv.innerHTML += `<b>Records :</b> ${player.recordsCount} | <b>Points :</b> ${player.totalPoints}<br>`;
    }
    if (verifier) {
        infoDiv.innerHTML += `<b>Niveaux vérifiés :</b> ${verifier.levelsVerified} | <b>Points vérif :</b> ${verifier.totalPoints}<br>`;
    }
    // Niveaux créés
    const createdList = document.getElementById('created-levels-list');
    createdList.innerHTML = '';
    if (createdLevels && createdLevels.length > 0) {
        createdLevels.forEach(l => {
            createdList.innerHTML += `<li>${l.levelName} (Rank ${l.approvedRank || '-'})</li>`;
        });
    } else {
        createdList.innerHTML = '<li>Aucun niveau créé</li>';
    }

    // Niveaux battus
    const beatenList = document.getElementById('beaten-levels-list');
    beatenList.innerHTML = '';
    if (player && player.records && player.records.length > 0) {
        player.records.forEach(r => {
            beatenList.innerHTML += `<li>${r.levelName} (Rank ${r.rank}) - ${r.points} pts - ${r.percentage}%</li>`;
        });
    } else {
        beatenList.innerHTML = '<li>Aucun niveau battu</li>';
    }

    // Niveaux vérifiés
    const verifList = document.getElementById('verifications-list');
    verifList.innerHTML = '';
    if (Array.isArray(arguments[0].verifiedLevels) && arguments[0].verifiedLevels.length > 0) {
        arguments[0].verifiedLevels.forEach(l => {
            verifList.innerHTML += `<li>${l.levelName} (Rank ${l.rank}) - ${l.points} pts</li>`;
        });
    } else {
        verifList.innerHTML = '<li>Aucun niveau vérifié</li>';
    }
}

(async function () {
    const username = getUserFromUrl();
    if (!username) {
        document.body.innerHTML = '<p>Utilisateur non spécifié.</p>';
        return;
    }
    const data = await fetchAccountData(username);
    renderAccountDetails(data, username);
})();
