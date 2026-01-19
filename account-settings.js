document.addEventListener('DOMContentLoaded', async () => {
    await enableSupabaseStorage();

    const client = window.supabaseClient;
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    const { data: profile } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile) return;

    usernameInput.value = profile.username || '';
    avatarUrlInput.value = profile.avatar_url || '';
    countryInput.value = profile.country || '';
    regionInput.value = profile.region || '';
});
document.getElementById('saveProfile').addEventListener('click', async () => {
    const client = window.supabaseClient;
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

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
        errorBox.textContent = 'Erreur sauvegarde';
        return;
    }

    alert('✅ Profil mis à jour');
});
const fileInput = document.getElementById('avatarFileInput');

fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    const client = window.supabaseClient;
    const { data: { user } } = await client.auth.getUser();

    const path = `${user.id}/${Date.now()}_${file.name}`;

    await client.storage.from('avatars').upload(path, file, { upsert: true });

    const { data } = client.storage.from('avatars').getPublicUrl(path);

    avatarUrlInput.value = data.publicUrl;
});
document.getElementById('changePassword').addEventListener('click', async () => {
    const pwd = newPassword.value;
    if (pwd.length < 6) return;

    const client = window.supabaseClient;
    const { error } = await client.auth.updateUser({ password: pwd });

    if (error) {
        errorBox.textContent = 'Erreur mot de passe';
        return;
    }

    alert('🔐 Mot de passe changé');
});
document.getElementById('logoutBtn').addEventListener('click', async () => {
    const client = window.supabaseClient;
    await client.auth.signOut();
    window.location.replace('index.html');
});
