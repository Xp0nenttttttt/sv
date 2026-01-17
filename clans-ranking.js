let clanClient = null;
let sortBy = 'points';

async function initClanRanking() {
    // Attendre que supabaseClient global soit disponible
    let attempts = 0;
    while (typeof supabaseClient === 'undefined' && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    if (typeof supabaseClient === 'undefined') {
        document.getElementById('rankingBody').innerHTML =
            '<tr><td colspan="6" class="muted" style="text-align: center;">Erreur: Supabase non disponible</td></tr>';
        return;
    }

    clanClient = supabaseClient;

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
        document.getElementById('rankingBody').innerHTML =
            '<tr><td colspan="6" class="muted" style="text-align: center;">Erreur de chargement</td></tr>';
        return;
    }

    await loadClanRanking();
}

async function loadClanRanking() {
    try {
        // Récupérer tous les clans
        const { data: clans } = await clanClient.from('clans').select('*');

        if (!clans || clans.length === 0) {
            document.getElementById('rankingBody').innerHTML =
                '<tr><td colspan="6" class="muted" style="text-align: center;">Aucun clan</td></tr>';
            return;
        }

        // Charger les données de storage
        const allRecords = await universalStorage.getData('svChallengeRecordSubmissions') || [];
        const allLevels = await universalStorage.getData('svChallengeSubmissions') || [];

        // Calculer les stats de chaque clan
        const clanStats = [];

        for (const clan of clans) {
            // Récupérer les membres du clan
            const { data: members } = await clanClient
                .from('clan_members')
                .select('user_id')
                .eq('clan_id', clan.id);

            if (!members || members.length === 0) {
                clanStats.push({
                    id: clan.id,
                    name: clan.name,
                    tag: clan.tag,
                    members: 0,
                    points: 0,
                    levels: 0,
                    records: 0
                });
                continue;
            }

            // Récupérer les usernames des membres
            const memberIds = members.map(m => m.user_id);
            const { data: profiles } = await clanClient
                .from('profiles')
                .select('id, username')
                .in('id', memberIds);

            const memberUsernames = profiles ? profiles.map(p => p.username) : [];

            // Compter les points (records acceptés, sans doublons par niveau)
            const clanRecords = allRecords.filter(r =>
                r.status === 'accepted' && memberUsernames.includes(r.player)
            );

            console.log(`Clan ${clan.name}:`, {
                memberUsernames,
                totalRecords: allRecords.length,
                clanRecordsCount: clanRecords.length,
                sampleRecord: JSON.stringify(clanRecords[0], null, 2)
            });

            // Grouper par levelId et compter les points une seule fois par niveau
            const levelPointsMap = {};
            clanRecords.forEach(record => {
                if (!levelPointsMap[record.levelId]) {
                    // Trouver le niveau correspondant
                    const level = allLevels.find(l => String(l.id) === String(record.levelId));
                    let points = 0;
                    if (level && level.approvedRank) {
                        // Utiliser la même formule que le leaderboard
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
            Object.values(levelPointsMap).forEach(points => {
                totalPoints += points;
            });

            console.log(`Clan ${clan.name} points records:`, { levelPointsMap, totalPoints });

            // Compter les niveaux uniques complétés
            const completedLevels = Object.keys(levelPointsMap).length;

            // Compter les niveaux soumis et acceptés + ajouter leurs points
            const clanLevels = allLevels.filter(l =>
                l.status === 'accepted' && memberUsernames.includes(l.authorName)
            );

            // Ajouter les points des niveaux vérifiés (soumis)
            const verifiedLevelPointsMap = {};
            clanLevels.forEach(level => {
                if (!verifiedLevelPointsMap[level.id]) {
                    let points = 0;
                    if (level.approvedRank) {
                        const rank = level.approvedRank;
                        if (rank === 1) points = 150;
                        else if (rank <= 10) points = 150 - (rank - 1) * 5;
                        else if (rank <= 50) points = 100 - (rank - 10) * 2;
                        else if (rank <= 100) points = 20 - Math.floor((rank - 50) / 10);
                        else points = 10;
                    }
                    verifiedLevelPointsMap[level.id] = points;
                }
            });

            let verifiedLevelPoints = 0;
            Object.values(verifiedLevelPointsMap).forEach(points => {
                verifiedLevelPoints += points;
            });

            totalPoints += verifiedLevelPoints;

            console.log(`Clan ${clan.name} points verified:`, { verifiedLevelPointsMap, verifiedLevelPoints, totalPoints });

            clanStats.push({
                id: clan.id,
                name: clan.name,
                tag: clan.tag,
                members: memberUsernames.length,
                points: totalPoints,
                levels: clanLevels.length,
                records: clanRecords.length
            });
        }

        // Trier selon le critère
        sortClans(clanStats);

        // Afficher le classement
        displayRanking(clanStats);

    } catch (error) {
        console.error('Erreur lors du chargement du classement:', error);
        document.getElementById('rankingBody').innerHTML =
            '<tr><td colspan="6" class="muted" style="text-align: center;">Erreur de chargement</td></tr>';
    }
}

function sortClans(stats) {
    switch (sortBy) {
        case 'points':
            stats.sort((a, b) => b.points - a.points);
            break;
        case 'members':
            stats.sort((a, b) => b.members - a.members);
            break;
        case 'levels':
            stats.sort((a, b) => b.levels - a.levels);
            break;
        case 'records':
            stats.sort((a, b) => b.records - a.records);
            break;
    }
}

function displayRanking(stats) {
    const tbody = document.getElementById('rankingBody');

    console.log('📊 Affichage du classement:', stats.length, 'clans');

    if (!stats || stats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="muted" style="text-align: center; padding: 20px;">Aucun clan avec des points</td></tr>';
        return;
    }

    tbody.innerHTML = stats.map((clan, index) => {
        const rank = index + 1;
        let rankClass = 'rank-other';
        if (rank === 1) rankClass = 'rank-1';
        else if (rank === 2) rankClass = 'rank-2';
        else if (rank === 3) rankClass = 'rank-3';

        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center;">
                        <span class="rank-badge ${rankClass}">${rank}</span>
                    </div>
                </td>
                <td>
                    <a href="clan.html?id=${clan.id}" class="clan-name">
                        ${clan.tag ? `[${clan.tag}]` : ''} ${clan.name}
                    </a>
                </td>
                <td class="stat">${clan.members}</td>
                <td class="stat" style="color: #ffd700; font-weight: bold;">${clan.points}</td>
                <td class="stat">${clan.levels}</td>
                <td class="stat">${clan.records}</td>
            </tr>
        `;
    }).join('');
}

function setSortBy(criteria) {
    sortBy = criteria;

    // Mettre à jour les boutons actifs
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Recharger le classement
    loadClanRanking();
}

document.addEventListener('DOMContentLoaded', initClanRanking);
