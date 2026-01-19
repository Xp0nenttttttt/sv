document.addEventListener('DOMContentLoaded', async () => {
    await enableSupabaseStorage();

    const client = window.supabaseClient;
    if (!client) return;

    // 🔎 éléments DOM (APRÈS chargement)
    const usernameInput = document.getElementById('usernameInput');
    const avatarUrlInput = document.getElementById('avatarUrlInput');
    const countryInput = document.getElementById('countryInput');
    const regionInput = document.getElementById('regionInput');
    const newPassword = document.getElementById('newPassword');

    const errorBox = document.getElementById('errorBox');
    const saveBtn = document.getElementById('saveProfile');
    const changePwdBtn = document.getElementById('changePassword');
    const logoutBtn = document.getElementById('logoutBtn');

    // 🔐 utilisateur connecté ?
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
        window.location.replace('login.html');
        return;
    }

    // 👤 charger profil
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

    // 💾 SAUVEGARDE PROFIL
    saveBtn.addEventListener('click', async () => {
        errorBox.textContent = '';

        const updates = {
            username: usernameInput.value.trim(),
            avatar_url: avatarUrlInput.value.trim(),
            country: countryInput.value.trim(),
            region: regionInput.value.trim()
        };

        const { error } = await client
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) {
            console.error(error);
            errorBox.textContent = 'Erreur sauvegarde profil';
            return;
        }

        alert('✅ Profil mis à jour');
    });

    // 🔐 CHANGER MOT DE PASSE
    changePwdBtn.addEventListener('click', async () => {
        errorBox.textContent = '';

        const pwd = newPassword.value.trim();
        if (pwd.length < 6) {
            errorBox.textContent = 'Mot de passe trop court (min 6 caractères)';
            return;
        }

        const { error } = await client.auth.updateUser({ password: pwd });

        if (error) {
            console.error(error);
            errorBox.textContent = 'Erreur changement mot de passe';
            return;
        }

        newPassword.value = '';
        alert('🔐 Mot de passe modifié');
    });

    // 🚪 DÉCONNEXION
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        await client.auth.signOut();
        window.location.replace('index.html');
    });
});
