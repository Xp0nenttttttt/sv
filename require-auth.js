document.addEventListener('DOMContentLoaded', async () => {
    await enableSupabaseStorage();

    const client = window.supabaseClient;
    if (!client) return;

    const { data: { user } } = await client.auth.getUser();

    if (!user) {
        // 🔐 pas connecté → login
        const redirectTo = encodeURIComponent(window.location.pathname);
        window.location.replace(`login.html?redirect=${redirectTo}`);
    }
});
