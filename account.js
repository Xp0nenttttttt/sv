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
        showToast('Connectez-vous pour enregistrer votre profil', 'error');
        return;
    }
    const payload = {
        id: accountSession.user.id,
        username: document.getElementById('username').value.trim(),
        country: document.getElementById('country').value.trim(),
        avatar_url: document.getElementById('avatar').value.trim()
    };
    // Try upsert; if forbidden, fallback to insert or update explicitly
    let { error } = await accountClient
        .from('profiles')
        .upsert(payload, { onConflict: 'id', returning: 'minimal' });
    if (error) {
        // Fallback: check if profile exists, then insert or update
        const { data: existing, error: selectErr } = await accountClient
            .from('profiles')
            .select('id')
            .eq('id', accountSession.user.id)
            .maybeSingle();
        if (selectErr) {
            showToast('Erreur: ' + selectErr.message, 'error');
            return;
        }
        if (!existing) {
            const { error: insertErr } = await accountClient
                .from('profiles')
                .insert(payload, { returning: 'minimal' });
            if (insertErr) {
                showToast('Erreur: ' + insertErr.message, 'error');
                return;
            }
        } else {
            const { error: updateErr } = await accountClient
                .from('profiles')
                .update({
                    username: payload.username,
                    country: payload.country,
                    avatar_url: payload.avatar_url
                })
                .eq('id', accountSession.user.id);
            if (updateErr) {
                showToast('Erreur: ' + updateErr.message, 'error');
                return;
            }
        }
    }
    showToast('Profil enregistré avec succès', 'success');
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


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('signupBtn').addEventListener('click', handleSignup);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('saveProfileBtn').addEventListener('click', saveProfile);
    initAccount();
});
