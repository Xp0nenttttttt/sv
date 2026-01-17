// Account page logic
let accountClient = null;
let accountSession = null;

async function initAccount() {
    if (!window.supabaseClient && typeof enableSupabaseStorage === 'function') {
        try { await enableSupabaseStorage(); } catch (e) { console.error(e); }
    }
    accountClient = window.supabaseClient || (supabase && supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY));
    if (!accountClient) {
        document.getElementById('authStatus').textContent = 'Supabase non initialisé';
        return;
    }
    await refreshSession();
    await loadProfile();
}

async function refreshSession() {
    const { data } = await accountClient.auth.getSession();
    accountSession = data.session || null;
    const isLogged = !!accountSession;
    document.getElementById('logoutBtn').style.display = isLogged ? 'inline-block' : 'none';
    document.getElementById('loginBtn').style.display = isLogged ? 'none' : 'inline-block';
    document.getElementById('signupBtn').style.display = isLogged ? 'none' : 'inline-block';
    document.getElementById('authStatus').textContent = isLogged ? `Connecté en tant que ${accountSession.user.email}` : '';
    document.getElementById('authError').textContent = '';
}

async function handleLogin() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    try {
        await authHelper.signIn(email, password);
        await refreshSession();
        await loadProfile();
    } catch (err) {
        document.getElementById('authError').textContent = err.message;
    }
}

async function handleSignup() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value.trim();
    try {
        await authHelper.signUp(email, password);
        await refreshSession();
        await loadProfile();
    } catch (err) {
        document.getElementById('authError').textContent = err.message;
    }
}

async function handleLogout() {
    try {
        await authHelper.signOut();
        await refreshSession();
        clearProfileFields();
    } catch (err) {
        document.getElementById('authError').textContent = err.message;
    }
}

function clearProfileFields() {
    document.getElementById('username').value = '';
    document.getElementById('country').value = '';
    document.getElementById('avatar').value = '';
    document.getElementById('profileMsg').textContent = '';
}

async function loadProfile() {
    if (!accountSession) { clearProfileFields(); return; }
    const { data, error } = await accountClient.from('profiles').select('*').eq('id', accountSession.user.id).maybeSingle();
    if (error) {
        document.getElementById('profileMsg').textContent = 'Erreur profil: ' + error.message;
        return;
    }
    if (data) {
        document.getElementById('username').value = data.username || '';
        document.getElementById('country').value = data.country || '';
        document.getElementById('avatar').value = data.avatar_url || '';
    } else {
        clearProfileFields();
    }
}

async function saveProfile() {
    if (!accountSession) {
        document.getElementById('profileMsg').textContent = 'Connectez-vous pour enregistrer votre profil';
        return;
    }
    const payload = {
        id: accountSession.user.id,
        username: document.getElementById('username').value.trim(),
        country: document.getElementById('country').value.trim(),
        avatar_url: document.getElementById('avatar').value.trim()
    };
    const { error } = await accountClient.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) {
        document.getElementById('profileMsg').textContent = 'Erreur: ' + error.message;
        return;
    }
    document.getElementById('profileMsg').textContent = 'Profil enregistré';
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('signupBtn').addEventListener('click', handleSignup);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
    initAccount();
});
