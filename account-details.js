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

        const allLevels =
            await universalStorage.getData('svChallengeSubmissions') || [];

        const [data, profile, clan] = await Promise.all([
            fetchAccountData(username, allLevels),
            fetchUserProfile(username),
            fetchUserClan(username)
        ]);

        renderAccountDetails(data, username, profile, clan);


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

    const acceptedLevels = allLevels.filter(
        lvl => lvl.status === 'accepted'
    );

    const createdLevels = acceptedLevels
        .filter(lvl =>
            lvl.authorName &&
            lvl.authorName.toLowerCase() === username.toLowerCase()
        )
        .map(lvl => ({
            levelId: lvl.id,
            levelName: lvl.levelName,
            rank: lvl.approvedRank
        }));

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

    const isTop1 = player?.rank === 1;
    const isTop2 = player?.rank === 2;
    const isTop3 = player?.rank === 3;

    return { player, verifier, createdLevels, beatenLevels, verifiedLevels, isTop1, isTop2, isTop3 };
}

// ──────────────────────────────
// Profile
async function fetchUserProfile(username) {
    const client =
        window.supabaseClient || window.supabase;

    if (!client || typeof client.from !== 'function') {
        console.warn('❌ Supabase client indisponible');
        return null;
    }

    const { data, error } = await client
        .from('profiles')
        .select('avatar_url')
        .ilike('username', username)
        .single();

    if (error) {
        console.warn('Avatar introuvable:', error.message);
        return null;
    }

    return data;
}

async function fetchUserClan(username) {
    const client = window.supabaseClient || window.supabase;
    if (!client) return null;

    const { data, error } = await client
        .from('clans')
        .select('tag')
        .ilike('members', `%${username}%`)
        .single();

    if (error) {
        console.warn('Clan introuvable:', error.message);
        return null;
    }

    return data;
}

// ──────────────────────────────
// Render
function renderAccountDetails(data, username, profile, clan) {
    const { player, verifier, createdLevels, beatenLevels, verifiedLevels } = data;

    const title = document.getElementById('account-title');

    title.innerHTML = `
    ${data.isTop1 ? `<span class="top1-badge">TOP 1</span>` : ''}

    <span class="account-name">
        ${clan?.tag ? `<span class="clan-tag">[${clan.tag}]</span>` : ''}
        ${username}
    </span>

    ${profile?.avatar_url ? `
        <img
            src="${profile.avatar_url}"
            alt="Avatar ${username}"
            class="account-avatar"
        />
    ` : ''}
`;


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
    renderStats(createdLevels.length, beatenLevels.length, verifiedLevels.length);

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
function renderStats(created, beaten, verified) {
    const max = Math.max(created, beaten, verified, 1);

    document.getElementById('stat-created').textContent = created;
    document.getElementById('stat-beaten').textContent = beaten;
    document.getElementById('stat-verified').textContent = verified;

    document.querySelector('.fill.created').style.width =
        `${(created / max) * 100}%`;

    document.querySelector('.fill.beaten').style.width =
        `${(beaten / max) * 100}%`;

    document.querySelector('.fill.verified').style.width =
        `${(verified / max) * 100}%`;
}
