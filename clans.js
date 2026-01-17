// Clan listing and creation
let clansClient = null;
let currentSession = null;
let profilesCache = {};

async function initClans() {
    const status = document.getElementById('authStatus');
    const errorEl = document.getElementById('authError');
    try {
        if (!window.supabaseClient && typeof enableSupabaseStorage === 'function') {
            await enableSupabaseStorage();
        }
        clansClient = window.supabaseClient || (supabase && supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY));
        if (!clansClient) throw new Error('Supabase non initialisé');

        await refreshSessionUI();
        await loadClans();
    } catch (err) {
        console.error(err);
        status.textContent = '';
        errorEl.textContent = err.message;
    }
}

async function refreshSessionUI() {
    const { data } = await clansClient.auth.getSession();
    currentSession = data.session || null;
    const isLogged = !!currentSession;
    const logoutBtn = document.getElementById('logoutBtn');
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const createForm = document.getElementById('createClanForm');
    const hint = document.getElementById('createClanHint');
    const status = document.getElementById('authStatus');
    const errorEl = document.getElementById('authError');

    logoutBtn.style.display = isLogged ? 'inline-block' : 'none';
    loginBtn.style.display = isLogged ? 'none' : 'inline-block';
    signupBtn.style.display = isLogged ? 'none' : 'inline-block';

    if (isLogged) {
        status.textContent = `Connecté en tant que ${currentSession.user.email}`;
        // Check if user already owns a clan
        const { data: ownedClan, error } = await clansClient
            .from('clans')
            .select('id')
            .eq('owner_id', currentSession.user.id)
            .maybeSingle();
        if (ownedClan) {
            createForm.style.display = 'none';
            hint.textContent = 'Vous possédez déjà un clan. Vous ne pouvez en créer qu\'un seul.';
        } else {
            createForm.style.display = 'block';
            hint.textContent = 'Connecté';
        }
    } else {
        status.textContent = '';
        createForm.style.display = 'none';
        hint.textContent = 'Connectez-vous pour créer un clan.';
    }
    errorEl.textContent = '';
}

async function loadClans() {
    const list = document.getElementById('clanList');
    const msg = document.getElementById('clanListMsg');
    list.innerHTML = 'Chargement...';
    const { data, error } = await clansClient.from('clans').select('*, owner_id').order('created_at', { ascending: false });
    if (error) {
        msg.textContent = 'Erreur de chargement des clans';
        console.error(error);
        return;
    }
    if (!data || data.length === 0) {
        list.innerHTML = '';
        msg.textContent = 'Aucun clan pour le moment.';
        return;
    }
    msg.textContent = '';
    list.innerHTML = data.map(clan => `
        <div class="clan-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>${clan.name}</strong> <span class="muted">[${clan.tag}]</span>
                </div>
                <a href="clan.html?id=${clan.id}">Voir</a>
            </div>
            <div class="muted">${clan.description || 'Pas de description'}</div>
        </div>
    `).join('');
}

async function createClan() {
    const msg = document.getElementById('clanCreateMsg');
    const name = document.getElementById('clanName').value.trim();
    const tag = document.getElementById('clanTag').value.trim();
    const desc = document.getElementById('clanDescription').value.trim();
    const logo = document.getElementById('clanLogo').value.trim();
    msg.textContent = '';

    if (!currentSession) {
        msg.textContent = 'Connexion requise';
        return;
    }
    if (!name || !tag) {
        msg.textContent = 'Nom et tag requis';
        return;
    }

    // Créer le clan et récupérer son id
    const { data: clanRow, error: clanErr } = await clansClient
        .from('clans')
        .insert({
            name,
            tag,
            description: desc,
            logo_url: logo || null,
            owner_id: currentSession.user.id
        })
        .select('*')
        .single();
    if (clanErr) {
        console.error(clanErr);
        msg.textContent = 'Erreur: ' + clanErr.message;
        return;
    }

    // Ajouter automatiquement le créateur comme leader dans les membres
    const { error: memberErr } = await clansClient
        .from('clan_members')
        .insert({ clan_id: clanRow.id, user_id: currentSession.user.id, role: 'leader' });
    if (memberErr) {
        console.warn('Clan créé mais ajout membre échoué:', memberErr.message);
        msg.textContent = 'Clan créé (ajout membre échoué). Vous pouvez réessayer plus tard.';
    } else {
        msg.textContent = 'Clan créé';
    }

    await loadClans();
}

async function handleLogin() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const errorEl = document.getElementById('authError');
    errorEl.textContent = '';
    try {
        await authHelper.signIn(email, password);
        await refreshSessionUI();
    } catch (err) {
        errorEl.textContent = err.message;
    }
}

async function handleSignup() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    const errorEl = document.getElementById('authError');
    errorEl.textContent = '';
    try {
        await authHelper.signUp(email, password);
        await refreshSessionUI();
    } catch (err) {
        errorEl.textContent = err.message;
    }
}

async function handleLogout() {
    const errorEl = document.getElementById('authError');
    errorEl.textContent = '';
    try {
        await authHelper.signOut();
        await refreshSessionUI();
    } catch (err) {
        errorEl.textContent = err.message;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('createClanBtn').addEventListener('click', createClan);
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('signupBtn').addEventListener('click', handleSignup);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    initClans();
});
