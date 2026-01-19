async function ensureUsername() {
    const client = window.supabaseClient;
    if (!client) return;

    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    const { data: profile } = await client
        .from('profiles')
        .select('id, username')
        .eq('id', user.id)
        .single();

    if (!profile) return;

    if (!profile.username) {
        const fallback = `Visiteur${Math.floor(1000 + Math.random() * 9000)}`;

        await client
            .from('profiles')
            .update({ username: fallback })
            .eq('id', user.id);

        console.log('Pseudo auto attribué:', fallback);
    }

    if (profile.username?.startsWith('Visiteur')) {
        window.location.href = 'username-setup.html';
    }
}
