let clanClient = null;
let sortBy = 'points';

async function initClanRanking() {
    // Attendre que supabaseClient soit disponible
    let attempts = 0;
    while (!window.supabaseClient && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    if (!window.supabaseClient) {
        document.getElementById('rankingBody').innerHTML =
            '<tr><td colspan="6" class="muted" style="text-align: center;">Erreur: Supabase non disponible</td></tr>';
        return;
    }

    clanClient = window.supabaseClient;

    // Initialiser le stockage
    if (typeof initializeSupabaseStorage === 'function' && !universalStorage) {
        await initializeSupabaseStorage();
    }

    // Attendre universalStorage
    let attempts = 0;
    while (!universalStorage && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
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

            // Compter les points (records acceptés)
            const clanRecords = allRecords.filter(r =>
                r.status === 'accepted' && memberUsernames.includes(r.player)
            );

            let totalPoints = 0;
            clanRecords.forEach(record => {
                totalPoints += record.points || 0;
            });

            // Compter les niveaux uniques complétés
            const completedLevels = new Set(clanRecords.map(r => r.levelId)).size;

            // Compter les niveaux soumis et acceptés
            const clanLevels = allLevels.filter(l =>
                l.status === 'accepted' && memberUsernames.includes(l.authorName)
            );

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
