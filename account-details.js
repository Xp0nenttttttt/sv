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

    // Niveaux créés (auteur)
    let createdLevels = [];
    if (typeof dataSyncManager !== 'undefined' && dataSyncManager.loadLevels) {
        const allLevels = await dataSyncManager.loadLevels();
        createdLevels = allLevels.filter(l => l.authorName && l.authorName.toLowerCase() === username.toLowerCase());
    } else if (typeof universalStorage !== 'undefined' && universalStorage.getData) {
        const allLevels = await universalStorage.getData('svChallengeSubmissions') || [];
        createdLevels = allLevels.filter(l => l.authorName && l.authorName.toLowerCase() === username.toLowerCase());
    }

    return { player, verifier, createdLevels };
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
    if (createdLevels.length > 0) {
        infoDiv.innerHTML += `<b>Niveaux créés :</b> ${createdLevels.length}`;
    }

    // Records
    const recordsList = document.getElementById('records-list');
    recordsList.innerHTML = '';
    if (player && player.records.length > 0) {
        player.records.forEach(r => {
            recordsList.innerHTML += `<li>${r.levelName} (Rank ${r.rank}) - ${r.points} pts - ${r.percentage}%</li>`;
        });
    } else {
        recordsList.innerHTML = '<li>Aucun record</li>';
    }

    // Vérifications
    const verifList = document.getElementById('verifications-list');
    verifList.innerHTML = '';
    if (verifier && verifier.levels.length > 0) {
        verifier.levels.forEach(l => {
            verifList.innerHTML += `<li>${l.levelName} (Rank ${l.rank}) - ${l.points} pts</li>`;
        });
    } else {
        verifList.innerHTML = '<li>Aucune vérification</li>';
    }

    // Niveaux créés
    const createdList = document.getElementById('created-levels-list');
    createdList.innerHTML = '';
    if (createdLevels.length > 0) {
        createdLevels.forEach(l => {
            createdList.innerHTML += `<li>${l.levelName} (Rank ${l.approvedRank || '-'})</li>`;
        });
    } else {
        createdList.innerHTML = '<li>Aucun niveau créé</li>';
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
