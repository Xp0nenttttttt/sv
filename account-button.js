document.addEventListener('DOMContentLoaded', async () => {
    const accountBtn = document.getElementById('accountBtn');
    if (!accountBtn) return;

    await enableSupabaseStorage();

    const client = window.supabaseClient;
    if (!client) return;

    accountBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const { data: { user } } = await client.auth.getUser();

        if (user) {
            // ✅ connecté → page paramètres compte
            window.location.href = 'account-settings.html';
        } else {
            // ❌ pas connecté → login
            window.location.href = 'login.html';
        }
    });
});
