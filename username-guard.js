document.addEventListener('DOMContentLoaded', async () => {
    await enableSupabaseStorage();

    const client = window.supabaseClient;
    if (!client) return;

    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    const currentPage = location.pathname.split('/').pop();

    const { data: profile } = await client
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();

    if ((!profile || !profile.username) && currentPage !== 'username-setup.html') {
        window.location.replace('username-setup.html');
    }
});
