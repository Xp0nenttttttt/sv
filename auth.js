// Auth helpers using Supabase
(async function () {
    // Ensure Supabase is available
    if (typeof enableSupabaseStorage === 'function') {
        try {
            await enableSupabaseStorage();
        } catch (err) {
            console.error('Auth init: unable to enable Supabase storage', err);
        }
    } else if (typeof loadSupabaseLibrary === 'function' && typeof initSupabase === 'function') {
        await loadSupabaseLibrary();
        await initSupabase();
    }

    if (!window.supabaseClient && typeof supabase !== 'undefined' && supabase.createClient && typeof SUPABASE_CONFIG !== 'undefined') {
        window.supabaseClient = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
    }

    const client = window.supabaseClient;
    if (!client) {
        console.error('Supabase client not available for auth');
        return;
    }

    async function getSession() {
        const { data } = await client.auth.getSession();
        return data.session || null;
    }

    async function signIn(email, password) {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data.session;
    }

    async function signUp(email, password) {
        const redirectTo = `${window.location.origin}/auth.html`;
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: redirectTo }
        });
        if (error) throw error;
        return data.session;
    }

    async function signOut() {
        await client.auth.signOut();
    }

    window.authHelper = {
        client,
        getSession,
        signIn,
        signUp,
        signOut
    };
})();
document.addEventListener('DOMContentLoaded', async () => {
    await enableSupabaseStorage();
    const client = window.supabaseClient;
    if (!client) return;

    // 🔁 Redirection si déjà connecté
    const { data: { user } } = await client.auth.getUser();
    if (user && (location.pathname.includes('login') || location.pathname.includes('register'))) {
        window.location.replace('index.html');
        return;
    }

    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');

    // 📝 REGISTER
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const username = document.getElementById('username').value.trim();
            const errorBox = document.getElementById('error');

            errorBox.textContent = '';

            // validation pseudo
            if (username.length < 3 || username.length > 20) {
                errorBox.textContent = 'Pseudo invalide (3–20 caractères)';
                return;
            }

            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                errorBox.textContent = 'Caractères autorisés : lettres, chiffres et _';
                return;
            }

            // unicité pseudo
            const { data: existing } = await client
                .from('profiles')
                .select('id')
                .ilike('username', username)
                .maybeSingle();

            if (existing) {
                errorBox.textContent = 'Ce pseudo est déjà utilisé';
                return;
            }

            // création auth
            const { data, error } = await client.auth.signUp({
                email,
                password
            });

            if (error) {
                errorBox.textContent = error.message;
                return;
            }

            // création profil
            const { error: profileError } = await client
                .from('profiles')
                .insert({
                    id: data.user.id,
                    username
                });

            if (profileError) {
                errorBox.textContent = 'Erreur création du profil';
                return;
            }

            window.location.replace('index.html');
        });
    }

    // 🔐 LOGIN
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const errorBox = document.getElementById('error');

            errorBox.textContent = '';

            const { error } = await client.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                errorBox.textContent = 'Email ou mot de passe incorrect';
                return;
            }

            window.location.replace('index.html');
        });
    }
});
