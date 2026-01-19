document.addEventListener('DOMContentLoaded', async () => {
    const currentPage = window.location.pathname.split('/').pop();

    await enableSupabaseStorage();

    const client = window.supabaseClient;
    if (!client) {
        console.error('❌ Supabase non disponible');
        return;
    }

    const {
        data: { user }
    } = await client.auth.getUser();

    if (!user) return; // pas connecté → pas concerné

    const { data: profile, error } = await client
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        console.error('❌ Erreur profil:', error);
        return;
    }

    console.log('👤 Profil:', profile);

    if ((!profile || !profile.username) && currentPage !== 'username-setup.html') {
        console.log('➡️ Redirection vers choix du pseudo');
        window.location.replace('username-setup.html');
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    const client = window.supabaseClient || window.supabase;

    const input = document.getElementById('usernameInput');
    const button = document.getElementById('saveUsername');
    const errorBox = document.getElementById('usernameError');

    if (!client) {
        errorBox.textContent = 'Erreur: Supabase non chargé';
        return;
    }

    button.addEventListener('click', async () => {
        errorBox.textContent = '';

        const username = input.value.trim();

        // 1️⃣ validation basique
        if (username.length < 3 || username.length > 20) {
            errorBox.textContent = 'Le pseudo doit contenir entre 3 et 20 caractères';
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            errorBox.textContent = 'Caractères autorisés : lettres, chiffres et _';
            return;
        }

        // 2️⃣ utilisateur connecté
        const { data: authData } = await client.auth.getUser();
        if (!authData?.user) {
            errorBox.textContent = 'Utilisateur non connecté';
            return;
        }

        const userId = authData.user.id;

        // 3️⃣ unicité du pseudo
        const { data: existing } = await client
            .from('profiles')
            .select('id')
            .ilike('username', username)
            .maybeSingle();

        if (existing) {
            errorBox.textContent = 'Ce pseudo est déjà utilisé';
            return;
        }

        // 4️⃣ sauvegarde
        const { error } = await client
            .from('profiles')
            .update({ username })
            .eq('id', userId);

        if (error) {
            console.error(error);
            errorBox.textContent = 'Erreur lors de l’enregistrement';
            return;
        }

        // 5️⃣ succès
        console.log('✅ Username enregistré:', username);
        window.location.href = 'index.html';
    });
});
