// user-list.js
// Récupère la liste des comptes utilisateurs (usernames) depuis Supabase

async function fetchUsernames() {
    if (!window.supabaseClient && typeof enableSupabaseStorage === 'function') {
        await enableSupabaseStorage();
    }
    const client = window.supabaseClient || (supabase && supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY));
    if (!client) return [];
    const { data, error } = await client.from('profiles').select('username').order('username', { ascending: true });
    if (error || !data) return [];
    return data.map(u => u.username).filter(Boolean);
}
