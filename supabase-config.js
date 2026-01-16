// === CONFIGURATION SUPABASE ===
// À remplir avec vos identifiants Supabase

const SUPABASE_CONFIG = {
    // Remplacez par votre Project URL depuis Supabase Settings > API
    URL: 'https://vgbrwtkcdjbmjhirlqyf.supabase.co',

    // Remplacez par votre Anon Key depuis Supabase Settings > API
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnYnJ3dGtjZGpibWpoaXJscXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTkzOTgsImV4cCI6MjA4NDEzNTM5OH0.1QUWS46g1rfF0O_-GgNVXIkOK2BPIq0KGSsYRb58rJg'
};

// Charger Supabase dynamiquement (évite les problèmes de Tracking Prevention)
function loadSupabaseLibrary() {
    return new Promise((resolve, reject) => {
        if (typeof supabase !== 'undefined') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Impossible de charger Supabase'));
        document.head.appendChild(script);
    });
}

// Fonction pour activer Supabase au chargement
async function enableSupabaseStorage() {
    if (!SUPABASE_CONFIG.URL || SUPABASE_CONFIG.URL === 'https://votre-projet.supabase.co') {
        console.warn('⚠️ Supabase non configuré. Utilisez toujours localStorage.');
        return false;
    }

    try {
        console.log('⏳ Chargement de Supabase...');
        await loadSupabaseLibrary();
        console.log('✅ Bibliothèque Supabase chargée');

        const supabaseAdapter = new SupabaseStorageAdapter(
            SUPABASE_CONFIG.URL,
            SUPABASE_CONFIG.KEY
        );
        universalStorage.switchAdapter(supabaseAdapter);
        console.log('✅ Supabase Storage activé');
        return true;
    } catch (error) {
        console.error('❌ Erreur lors de l\'activation de Supabase:', error);
        console.log('ℹ️ Utilisation de localStorage en secours');
        return false;
    }
}

// À appeler depuis la console une fois configuré :
// enableSupabaseStorage()

