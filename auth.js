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
        const { data, error } = await client.auth.signUp({ email, password });
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
