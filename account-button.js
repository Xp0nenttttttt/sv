document.addEventListener('DOMContentLoaded', async () => {
    await enableSupabaseStorage();

    const client = window.supabaseClient;
    if (!client) return;

    const { data: { user } } = await client.auth.getUser();

    const btn = document.getElementById('accountBtn');
    if (!btn) return;

    btn.href = user ? 'account-settings.html' : 'login.html';
});
