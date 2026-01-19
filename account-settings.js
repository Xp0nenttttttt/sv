document.addEventListener('DOMContentLoaded', async () => {
    await enableSupabaseStorage();

    const client = window.supabaseClient;
    if (!client) return;

    // 🔐 utilisateur connecté ?
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
        // pas connecté → login
        window.location.replace('login.html');
        return;
    }

    // 👤 profil
    const { data: profile, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error || !profile) {
        console.error('Profil introuvable');
        return;
    }

    // 🧩 remplir le formulaire
    usernameInput.value = profile.username || '';
    avatarUrlInput.value = profile.avatar_url || '';
    countryInput.value = profile.country || '';
    regionInput.value = profile.region || '';
});

document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();

    const client = window.supabaseClient;
    if (!client) return;

    const { error } = await client.auth.signOut();

    if (error) {
        console.error(error);
        alert('Erreur lors de la déconnexion');
        return;
    }

    console.log('👋 Déconnecté');
    window.location.replace('index.html');
});


