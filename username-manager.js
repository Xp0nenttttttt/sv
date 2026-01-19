document.addEventListener('DOMContentLoaded', async () => {
    console.log('🟡 Username manager lancé');

    const client = window.supabaseClient || window.supabase;
    if (!client) {
        console.warn('❌ Supabase non prêt');
        return;
    }

    // 1️⃣ utilisateur connecté ?
    const { data: authData } = await client.auth.getUser();

    if (!authData?.user) {
        console.log('👤 Aucun utilisateur connecté');
        return;
    }

    const userId = authData.user.id;
    console.log('👤 User ID:', userId);

    // 2️⃣ récupérer le profil
    const { data: profile, error } = await client
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

    if (error) {
        console.warn('⚠️ Profil introuvable, redirection');
        window.location.href = 'username-setup.html';
        return;
    }

    // 3️⃣ vérifier le pseudo
    const username = profile?.username;

    if (!username || username.trim().length < 3) {
        console.log('🚨 Username invalide → redirection');
        window.location.href = 'username-setup.html';
        return;
    }

    console.log('✅ Username valide:', username);
});
