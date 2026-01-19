document.addEventListener('DOMContentLoaded', async () => {
    // Activer Supabase
    try {
        await enableSupabaseStorage();
    } catch (e) {
        console.error('❌ Supabase non prêt');
        return;
    }

    const client = window.supabaseClient;
    if (!client) {
        console.error('❌ Supabase client manquant');
        return;
    }

    const { data: { user } } = await client.auth.getUser();

    if (!user) {
        console.log('🔒 Utilisateur non connecté → redirection login');
        window.location.replace('login.html');
    }


});
