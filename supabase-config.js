// === CONFIGURATION SUPABASE ===
// À remplir avec vos identifiants Supabase

const SUPABASE_CONFIG = {
    // Remplacez par votre Project URL depuis Supabase Settings > API
    URL: 'https://bpgotjdnrbrbwfckaayz.supabase.co',

    // Remplacez par votre Anon Key depuis Supabase Settings > API
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwZ290amRucmJyYndmY2thYXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzAwMTcsImV4cCI6MjA4NDE0NjAxN30.c0Y9MLW6HQBBJhN04MGHamOE6flLKqyPWRbyQBmNI_8'
};

// Charger Supabase dynamiquement - Compatible avec npm install local
async function loadSupabaseLibrary() {
    // Vérifier si Supabase est déjà chargé
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        return;
    }

    // Charger la version UMD (non-ESM) pour compatibilité file:// et vieux navigateurs
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
        script.onload = () => resolve();
        script.onerror = () => {
            script.src = 'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Impossible de charger Supabase'));
            document.head.appendChild(script);
        };
        document.head.appendChild(script);
    });
}

// Fonction pour activer Supabase au chargement
async function enableSupabaseStorage() {
    if (!SUPABASE_CONFIG.URL || SUPABASE_CONFIG.URL === 'https://votre-projet.supabase.co') {
        console.warn('⚠️ Supabase non configuré.');
        throw new Error('Supabase non configuré');
    }

    try {
        console.log('⏳ Initialisation Supabase exclusive...');

        // Utiliser la fonction d'initialisation de storage-adapter.js
        if (typeof initializeSupabaseStorage === 'function') {
            await initializeSupabaseStorage();
            console.log('✅ Supabase Storage initialisé (stockage unique)');
            return true;
        } else {
            throw new Error('initializeSupabaseStorage non disponible');
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'activation de Supabase:', error);
        throw error;
    }
}

// À appeler depuis la console une fois configuré :
// enableSupabaseStorage()

