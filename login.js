document.addEventListener('DOMContentLoaded', async () => {
    await enableSupabaseStorage();

    const client = window.supabaseClient;
    if (!client) return;

    const loginBtn = document.getElementById('loginBtn');
    const errorBox = document.getElementById('loginError');

    loginBtn.addEventListener('click', async () => {
        errorBox.textContent = '';

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            errorBox.textContent = 'Email et mot de passe requis';
            return;
        }

        const { error } = await client.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            errorBox.textContent = error.message;
            return;
        }

        // 🔁 redirection intelligente
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');

        window.location.replace(redirect || 'index.html');
    });
});
