document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    await enableSupabaseStorage();
    const client = window.supabaseClient;

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const username = document.getElementById('username').value.trim();
    const errorBox = document.getElementById('error');

    errorBox.textContent = '';

    // 🔎 validation pseudo
    if (username.length < 3 || username.length > 20) {
        errorBox.textContent = 'Pseudo invalide (3–20 caractères)';
        return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        errorBox.textContent = 'Caractères autorisés : lettres, chiffres, _';
        return;
    }

    // 🔁 unicité pseudo
    const { data: existing } = await client
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle();

    if (existing) {
        errorBox.textContent = 'Ce pseudo est déjà utilisé';
        return;
    }

    // 🧾 création du compte
    const { data, error } = await client.auth.signUp({
        email,
        password
    });

    if (error) {
        errorBox.textContent = error.message;
        return;
    }

    const user = data.user;

    // 🧠 création du profil
    const { error: profileError } = await client
        .from('profiles')
        .insert({
            id: user.id,
            username
        });

    if (profileError) {
        errorBox.textContent = 'Erreur création du profil';
        return;
    }

    // ✅ succès
    window.location.href = 'index.html';
});
