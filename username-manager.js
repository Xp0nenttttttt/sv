document.addEventListener('DOMContentLoaded', async () => {
    await enableSupabaseStorage();

    const client = window.supabaseClient;
    if (!client) return;

    const input = document.getElementById('usernameInput');
    const button = document.getElementById('saveUsername');
    const errorBox = document.getElementById('usernameError');

    button.addEventListener('click', async () => {
        errorBox.textContent = '';

        const username = input.value.trim();

        if (username.length < 3 || username.length > 20) {
            errorBox.textContent = '3 à 20 caractères requis';
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            errorBox.textContent = 'Caractères autorisés : lettres, chiffres et _';
            return;
        }

        const { data: { user } } = await client.auth.getUser();
        if (!user) {
            errorBox.textContent = 'Non connecté';
            return;
        }

        const { data: existing } = await client
            .from('profiles')
            .select('id')
            .ilike('username', username)
            .maybeSingle();

        if (existing && existing.id !== user.id) {
            errorBox.textContent = 'Pseudo déjà utilisé';
            return;
        }

        const { error } = await client
            .from('profiles')
            .upsert({
                id: user.id,
                username
            });

        if (error) {
            errorBox.textContent = 'Erreur enregistrement';
            return;
        }

        window.location.replace('index.html');
    });
});
