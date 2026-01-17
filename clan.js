// Clan detail page
let clanClient = null;
let currentSession = null;
let currentClan = null;
let profilesCache = {};
let isAdmin = false;

function getParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

async function checkAdminStatus() {
    if (!currentSession) {
        isAdmin = false;
        return;
    }
    const { data, error } = await clanClient
        .from('admin_users')
        .select('id')
        .eq('id', currentSession.user.id)
        .maybeSingle();
    isAdmin = !!data && !error;
}

async function initClanPage() {
    if (!window.supabaseClient && typeof enableSupabaseStorage === 'function') {
        try { await enableSupabaseStorage(); } catch (e) { console.error(e); }
    }
    clanClient = window.supabaseClient || (supabase && supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY));
    if (!clanClient) {
        document.getElementById('clanInfo').textContent = 'Supabase non initialisé';
        return;
    }

    const { data } = await clanClient.auth.getSession();
    currentSession = data.session || null;
    await checkAdminStatus();

    const clanId = getParam('id');
    if (!clanId) {
        document.getElementById('clanInfo').textContent = 'Clan introuvable';
        return;
    }

    await loadClan(clanId);
    await loadMembers(clanId);
    await loadClanLevels(clanId);

    const inviteToken = getParam('invite');
    if (inviteToken && currentSession) {
        await acceptInvite(inviteToken, clanId);
        await loadMembers(clanId);
    }
}

function switchTab(tabName, event) {
    // Cacher tous les contenus
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });

    // Désactiver tous les boutons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Afficher le contenu sélectionné
    document.getElementById(`tab-${tabName}`).style.display = 'block';

    // Activer le bouton cliqué
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

async function loadClan(clanId) {
    const { data, error } = await clanClient.from('clans').select('*').eq('id', clanId).single();
    const info = document.getElementById('clanInfo');
    if (error || !data) {
        info.textContent = 'Clan introuvable';
        return;
    }
    currentClan = data;
    document.getElementById('clanTitle').textContent = `${data.name} [${data.tag}]`;
    info.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
                <h2 style="margin:0;">${data.name} <span class="muted">[${data.tag}]</span></h2>
                <div class="muted">${data.description || 'Pas de description'}</div>
            </div>
            ${data.logo_url ? `<img src="${data.logo_url}" alt="logo" style="width:64px; height:64px; object-fit:cover; border-radius:8px;">` : ''}
        </div>
    `;

    const inviteCard = document.getElementById('inviteCard');
    if (currentSession && currentSession.user.id === data.owner_id) {
        inviteCard.style.display = 'block';
        document.getElementById('inviteBtn').onclick = () => generateInvite(clanId);
    } else {
        inviteCard.style.display = 'none';
    }

    // Show action buttons (delete for owner, leave for members, admin delete for admin)
    const actionsDiv = document.getElementById('clanActions');

    if (isAdmin) {
        actionsDiv.innerHTML = '<h3>Actions Admin</h3><button class="btn btn-danger" id="adminDeleteClanBtn">🗑️ Supprimer ce clan (Admin)</button>';
        actionsDiv.style.display = 'block';
        document.getElementById('adminDeleteClanBtn').onclick = () => adminDeleteClan(clanId);
    } else if (currentSession && currentSession.user.id === data.owner_id) {
        actionsDiv.innerHTML = '<h3>Actions</h3><button class="btn btn-danger" id="deleteClanBtn">🗑️ Supprimer le clan</button>';
        actionsDiv.style.display = 'block';
        document.getElementById('deleteClanBtn').onclick = () => deleteClan(clanId);
    } else if (currentSession) {
        actionsDiv.innerHTML = '<h3>Actions</h3><button class="btn btn-warning" id="leaveClanBtn">Quitter le clan</button>';
        actionsDiv.style.display = 'block';
        document.getElementById('leaveClanBtn').onclick = () => leaveClan(clanId);
    } else {
        actionsDiv.style.display = 'none';
    }
}

async function loadProfile(userId) {
    if (profilesCache[userId]) return profilesCache[userId];
    const { data, error } = await clanClient.from('profiles').select('username,country').eq('id', userId).maybeSingle();
    if (error) return { username: userId, country: '' };
    const profile = data || { username: userId, country: '' };
    profilesCache[userId] = profile;
    return profile;
}

async function loadMembers(clanId) {
    const list = document.getElementById('memberList');
    list.textContent = 'Chargement...';
    const { data, error } = await clanClient.from('clan_members').select('*').eq('clan_id', clanId);
    if (error) {
        list.textContent = 'Erreur chargement membres';
        return;
    }
    if (!data || data.length === 0) {
        list.textContent = 'Aucun membre pour le moment';
        return;
    }

    const rows = await Promise.all(data.map(async m => {
        const profile = await loadProfile(m.user_id);
        const role = m.role || 'member';
        const country = profile.country ? ` (${profile.country})` : '';
        const username = profile.username || m.user_id;
        return `<div><strong>${username}</strong>${country} <span class="badge-role">${role}</span></div>`;
    }));

    list.innerHTML = rows.join('');
}

async function generateInvite(clanId) {
    const email = document.getElementById('inviteEmail').value.trim();
    const msg = document.getElementById('inviteMsg');
    msg.textContent = '';
    const token = crypto.randomUUID();
    const { error } = await clanClient.from('clan_invites').insert({
        clan_id: clanId,
        email: email || null,
        token,
        expires_at: null
    });
    if (error) {
        msg.textContent = 'Erreur: ' + error.message;
        return;
    }
    msg.textContent = `Invitation créée. Lien: ${location.origin}${location.pathname}?id=${clanId}&invite=${token}`;
}

async function acceptInvite(token, clanId) {
    // Use secure RPC to accept invite by token (handles validation + membership insert server-side)
    const { error } = await clanClient.rpc('accept_clan_invite', { invite_token: token });
    if (error) {
        console.error('Accept invite failed:', error.message);
        showToast('Échec de l\'acceptation de l\'invitation: ' + error.message, 'error');
        return;
    }
    showToast('Invitation acceptée. Vous avez rejoint le clan.', 'success');
}

async function deleteClan(clanId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce clan ? Cette action est irréversible.')) return;
    const { error } = await clanClient.rpc('delete_clan', { clan_id: clanId });
    if (error) {
        showToast('Erreur: ' + error.message, 'error');
        return;
    }
    showToast('Clan supprimé', 'success');
    setTimeout(() => window.location.href = 'clans.html', 1500);
}

async function adminDeleteClan(clanId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce clan ? Cette action est irréversible.')) return;
    const { error } = await clanClient.rpc('admin_delete_clan', { clan_id: clanId });
    if (error) {
        showToast('Erreur: ' + error.message, 'error');
        return;
    }
    showToast('Clan supprimé par admin', 'success');
    setTimeout(() => window.location.href = 'clans.html', 1500);
}

async function loadClanLevels(clanId) {
    const levelsList = document.getElementById('levelsList');
    levelsList.innerHTML = '<p class="muted">Chargement...</p>';

    // Récupérer les membres du clan
    const { data: members, error: membersError } = await clanClient
        .from('clan_members')
        .select('user_id')
        .eq('clan_id', clanId);

    if (membersError || !members || members.length === 0) {
        levelsList.innerHTML = '<p class="muted">Aucun membre dans ce clan</p>';
        return;
    }

    // Récupérer les profils des membres pour avoir leurs usernames
    const memberIds = members.map(m => m.user_id);
    const { data: profiles } = await clanClient
        .from('profiles')
        .select('id, username')
        .in('id', memberIds);

    const profilesMap = {};
    if (profiles) {
        profiles.forEach(p => {
            profilesMap[p.id] = p.username;
        });
    }

    console.log('👥 Membres du clan:', memberIds);
    console.log('📋 Profils chargés:', profilesMap);
    console.log('🔧 universalStorage disponible?', typeof universalStorage !== 'undefined');

    // Charger les records acceptés via universalStorage
    let allRecords = [];
    if (typeof universalStorage !== 'undefined' && typeof universalStorage.getData === 'function') {
        const rawRecords = await universalStorage.getData('svChallengeRecordSubmissions') || [];
        console.log('📦 Total records bruts:', rawRecords.length);
        if (rawRecords.length > 0) {
            console.log('Exemples de records:', rawRecords.slice(0, 3).map(r => ({ player: r.player, status: r.status, level: r.levelId })));
        }
        allRecords = rawRecords.filter(r => r.status === 'accepted');
    }

    console.log('🏆 Total records acceptés:', allRecords.length);

    // Charger les niveaux acceptés
    let allLevels = [];
    if (typeof universalStorage !== 'undefined' && typeof universalStorage.getData === 'function') {
        const rawLevels = await universalStorage.getData('svChallengeSubmissions') || [];
        console.log('📦 Total niveaux bruts:', rawLevels.length);
        if (rawLevels.length > 0) {
            console.log('Exemples de niveaux:', rawLevels.slice(0, 3).map(l => ({ name: l.levelName, status: l.status })));
        }
        allLevels = rawLevels.filter(l => l.status === 'accepted');
    }

    console.log('📊 Total niveaux acceptés:', allLevels.length);

    // Filtrer les records des membres du clan
    const memberUsernames = Object.values(profilesMap);
    console.log('🔍 Usernames des membres:', memberUsernames);

    const clanRecords = allRecords.filter(r => {
        const match = memberUsernames.includes(r.player);
        if (match) {
            console.log('✅ Record trouvé pour membre:', r.player, 'sur niveau', r.levelId);
        }
        return match;
    });

    console.log('🎯 Records du clan:', clanRecords.length);

    // Grouper par niveau
    const levelMap = {};
    clanRecords.forEach(record => {
        const levelId = record.levelId;
        if (!levelMap[levelId]) {
            levelMap[levelId] = {
                records: [],
                level: allLevels.find(l => String(l.id) === String(levelId))
            };
        }
        levelMap[levelId].records.push(record);
    });

    // Afficher les niveaux
    const levelEntries = Object.values(levelMap).filter(entry => entry.level);

    if (levelEntries.length === 0) {
        levelsList.innerHTML = '<p class="muted">Aucun niveau complété par les membres du clan</p>';
        return;
    }

    // Trier par rang du niveau
    levelEntries.sort((a, b) => (a.level.approvedRank || 999) - (b.level.approvedRank || 999));

    levelsList.innerHTML = levelEntries.map(entry => {
        // Trier les records par date pour trouver le premier
        const sortedRecords = entry.records.sort((a, b) =>
            new Date(a.submittedAt) - new Date(b.submittedAt)
        );
        const firstClear = sortedRecords[0];
        const completionCount = entry.records.length;

        return `
            <div class="level-item">
                <div>
                    <div class="level-name">
                        <a href="level-details.html?id=${entry.level.id}" style="color: #9bb4ff; text-decoration: none;">
                            #${entry.level.approvedRank || '?'} - ${entry.level.levelName || 'Niveau inconnu'}
                        </a>
                    </div>
                    <div class="first-clear">
                        🥇 Premier clear: ${firstClear.player} 
                        ${firstClear.percentage === 100 ? '(100%)' : `(${firstClear.percentage}%)`}
                    </div>
                </div>
                <div class="muted">
                    ${completionCount} membre${completionCount > 1 ? 's' : ''}
                </div>
            </div>
        `;
    }).join('');
}


async function leaveClan(clanId) {
    if (!confirm('Êtes-vous sûr de vouloir quitter ce clan ?')) return;
    const { error } = await clanClient.rpc('leave_clan', { clan_id: clanId });
    if (error) {
        showToast('Erreur: ' + error.message, 'error');
        return;
    }
    showToast('Vous avez quitté le clan', 'success');
    setTimeout(() => window.location.href = 'clans.html', 1500);
}


function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.textContent = message;
    const bg = type === 'error' ? 'rgba(220, 53, 69, 0.95)' : 'rgba(25, 135, 84, 0.95)';
    toast.style.cssText = [
        'position:fixed',
        'bottom:20px',
        'left:50%', 'transform:translateX(-50%)',
        `background:${bg}`,
        'color:#fff',
        'padding:10px 16px',
        'border-radius:8px',
        'box-shadow:0 6px 20px rgba(0,0,0,0.2)',
        'z-index:9999',
        'font-weight:600',
        'max-width:80%', 'text-align:center'
    ].join(';');
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = 'opacity 250ms ease';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

document.addEventListener('DOMContentLoaded', initClanPage);
