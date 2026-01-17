// === CONFIGURATION SUPABASE ===
// À remplir avec vos identifiants Supabase

const SUPABASE_CONFIG = {
    // Remplacez par votre Project URL depuis Supabase Settings > API
    URL: 'https://bpgotjdnrbrbwfckaayz.supabase.co',

    // Remplacez par votre Anon Key depuis Supabase Settings > API
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwZ290amRucmJyYndmY2thYXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzAwMTcsImV4cCI6MjA4NDE0NjAxN30.c0Y9MLW6HQBBJhN04MGHamOE6flLKqyPWRbyQBmNI_8'
};

let supabaseClient = null;

// Initialiser Supabase
async function initSupabase() {
    if (supabaseClient) return supabaseClient;

    try {
        // Charger la bibliothèque Supabase
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase library not loaded');
        }

        supabaseClient = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
        window.supabaseClient = supabaseClient;
        console.log('✅ Supabase client initialisé');
        return supabaseClient;
    } catch (error) {
        console.error('❌ Erreur initialisation Supabase:', error);
        throw error;
    }
}

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
        script.onload = () => {
            console.log('✅ Supabase library chargée');
            resolve();
        };
        script.onerror = () => {
            script.src = 'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js';
            script.onload = () => {
                console.log('✅ Supabase library chargée (fallback unpkg)');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Impossible de charger Supabase');
                reject(new Error('Impossible de charger Supabase'));
            };
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
        console.log('⏳ Chargement et initialisation Supabase...');

        // D'abord charger la lib
        await loadSupabaseLibrary();

        // Puis initialiser le client
        await initSupabase();

        // Initialiser le stockage universel avec Supabase
        if (typeof initializeSupabaseStorage === 'function') {
            await initializeSupabaseStorage();
        }

        console.log('✅ Supabase Storage initialisé (stockage unique)');
        return true;
    } catch (error) {
        console.error('❌ Erreur lors de l\'activation de Supabase:', error);
        throw error;
    }
}

// Initialiser Supabase automatiquement au chargement
if (typeof window !== 'undefined') {
    // Attendre que la lib Supabase soit chargée
    if (typeof supabase !== 'undefined') {
        initSupabase();
    } else {
        window.addEventListener('load', () => {
            if (typeof supabase !== 'undefined') {
                initSupabase();
            }
        });
    }
}
