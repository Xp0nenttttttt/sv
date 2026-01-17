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
    const { data, error } = await clanClient.from('clan_invites').select('*').eq('token', token).eq('clan_id', clanId).maybeSingle();
    if (error || !data) return;
    // Check existing membership
    const { data: existing } = await clanClient.from('clan_members').select('*').eq('clan_id', clanId).eq('user_id', currentSession.user.id).maybeSingle();
    if (!existing) {
        await clanClient.from('clan_members').insert({ clan_id: clanId, user_id: currentSession.user.id, role: 'member' });
    }
}

document.addEventListener('DOMContentLoaded', initClanPage);
