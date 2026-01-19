// user-list.js
// Récupère la liste des comptes utilisateurs (usernames) depuis Supabase

async function fetchUsernames() {
    const client = window.supabaseClient || window.supabase;
    if (!client) {
        console.warn('❌ Supabase non disponible');
        return [];
    }

    const { data, error } = await client
        .from('profiles')
        .select('username')
        .order('username', { ascending: true });

    if (error) {
        console.error('Erreur récupération utilisateurs:', error.message);
        return [];
    }

    return data
        .map(u => u.username)
        .filter(Boolean);
}

