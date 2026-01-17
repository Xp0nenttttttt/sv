// Clan detail page
let clanClient = null;
let currentSession = null;
let currentClan = null;
let profilesCache = {};

function getParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
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

    const clanId = getParam('id');
    if (!clanId) {
        document.getElementById('clanInfo').textContent = 'Clan introuvable';
        return;
    }

    await loadClan(clanId);
    await loadMembers(clanId);

    const inviteToken = getParam('invite');
    if (inviteToken && currentSession) {
        await acceptInvite(inviteToken, clanId);
        await loadMembers(clanId);
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

    // Show action buttons (delete for owner, leave for members)
    const actionsDiv = document.getElementById('clanActions');
    if (currentSession && currentSession.user.id === data.owner_id) {
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
