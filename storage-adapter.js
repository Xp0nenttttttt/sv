// === ABSTRACTION DE STOCKAGE ===
// Cette couche permet de basculer entre localStorage et une base de données externe
// sans modifier le code des managers (SubmissionManager, RecordSubmissionManager, etc.)

class StorageAdapter {
    async getData(key) {
        throw new Error('getData() doit être implémenté');
    }

    async setData(key, data) {
        throw new Error('setData() doit être implémenté');
    }

    async removeData(key) {
        throw new Error('removeData() doit être implémenté');
    }

    async getAllKeys() {
        throw new Error('getAllKeys() doit être implémenté');
    }
}

// === ADAPTATEUR LOCALSTORAGE (Par défaut, déjà fonctionnel) ===
class LocalStorageAdapter extends StorageAdapter {
    async getData(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    async setData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                throw new Error('localStorage quota exceeded. Run storageManager.fullCleanup()');
            }
            throw error;
        }
    }

    async removeData(key) {
        localStorage.removeItem(key);
        return true;
    }

    async getAllKeys() {
        return Object.keys(localStorage);
    }
}

// === ADAPTATEUR SUPABASE (À configurer) ===
class SupabaseStorageAdapter extends StorageAdapter {
    constructor(supabaseUrl, supabaseKey) {
        super();
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        this.tableName = 'storage_data';
        this.client = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        // Charger la bibliothèque Supabase
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase client not loaded. Include: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
        }

        this.client = supabase.createClient(this.supabaseUrl, this.supabaseKey);
        this.initialized = true;

        // Créer la table si elle n'existe pas
        await this.ensureTableExists();
    }

    async ensureTableExists() {
        // Table créée via SQL Editor dans Supabase
        // Vérifier que la table existe en tentant une requête simple
        try {
            await this.client.from(this.tableName).select('id').limit(1);
            console.log('✅ Table storage_data connectée');
        } catch (err) {
            console.error('❌ Table storage_data introuvable. Exécutez le SQL de création.');
        }
    }

    async getData(key) {
        await this.initialize();
        const { data, error } = await this.client
            .from(this.tableName)
            .select('data')
            .eq('storage_key', key)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            throw error;
        }

        return data ? data.data : null;
    }

    async setData(key, data) {
        await this.initialize();
        const { error: upsertError } = await this.client
            .from(this.tableName)
            .upsert(
                {
                    storage_key: key,
                    data: data,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'storage_key' }
            );

        if (upsertError) throw upsertError;
        return true;
    }

    async removeData(key) {
        await this.initialize();
        const { error } = await this.client
            .from(this.tableName)
            .delete()
            .eq('storage_key', key);

        if (error) throw error;
        return true;
    }

    async getAllKeys() {
        await this.initialize();
        const { data, error } = await this.client
            .from(this.tableName)
            .select('storage_key');

        if (error) throw error;
        return data.map(row => row.storage_key);
    }
}

// === ADAPTATEUR FIREBASE REALTIME (À configurer) ===
class FirebaseStorageAdapter extends StorageAdapter {
    constructor(firebaseConfig) {
        super();
        this.firebaseConfig = firebaseConfig;
        this.db = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        // Charger Firebase
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase not loaded. Include: <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js"></script>');
        }

        firebase.initializeApp(this.firebaseConfig);
        this.db = firebase.database();
        this.initialized = true;
    }

    async getData(key) {
        await this.initialize();
        const snapshot = await this.db.ref(`storage/${key}`).get();
        return snapshot.val();
    }

    async setData(key, data) {
        await this.initialize();
        await this.db.ref(`storage/${key}`).set(data);
        return true;
    }

    async removeData(key) {
        await this.initialize();
        await this.db.ref(`storage/${key}`).remove();
        return true;
    }

    async getAllKeys() {
        await this.initialize();
        const snapshot = await this.db.ref('storage').get();
        return snapshot.val() ? Object.keys(snapshot.val()) : [];
    }
}

// === GESTIONNAIRE DE STOCKAGE UNIVERSEL ===
class UniversalStorageManager {
    constructor(adapter = null) {
        // Par défaut, utilise localStorage
        this.adapter = adapter || new LocalStorageAdapter();
        this.cache = {}; // Cache local pour éviter les requêtes répétées
        this.cacheEnabled = true;
    }

    switchAdapter(newAdapter) {
        console.log('Changement d\'adaptateur de stockage...');
        this.adapter = newAdapter;
        this.cache = {}; // Vider le cache
        console.log('✅ Adaptateur changé avec succès');
    }

    enableCache(enabled = true) {
        this.cacheEnabled = enabled;
        if (!enabled) this.cache = {};
    }

    async getData(key) {
        // Vérifier le cache en premier
        if (this.cacheEnabled && key in this.cache) {
            return this.cache[key];
        }

        const data = await this.adapter.getData(key);

        // Mettre en cache
        if (this.cacheEnabled && data) {
            this.cache[key] = data;
        }

        return data;
    }

    async setData(key, data) {
        const result = await this.adapter.setData(key, data);

        // Mettre en cache
        if (this.cacheEnabled) {
            this.cache[key] = data;
        }

        return result;
    }

    async removeData(key) {
        const result = await this.adapter.removeData(key);

        // Supprimer du cache
        delete this.cache[key];

        return result;
    }

    async getAllKeys() {
        return await this.adapter.getAllKeys();
    }

    // Obtenir l'adaptateur courant
    getCurrentAdapter() {
        return this.adapter.constructor.name;
    }
}

// === INSTANCE GLOBALE ===
let universalStorage = new UniversalStorageManager();

// === DOCUMENTATION D'UTILISATION FUTURE ===
/*

CONFIGURATION SUPABASE (À faire plus tard):

1. Créer un compte Supabase: https://supabase.com
2. Créer une table "storage_data":
   CREATE TABLE storage_data (
     id BIGSERIAL PRIMARY KEY,
     storage_key TEXT UNIQUE NOT NULL,
     data JSONB NOT NULL,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

3. Inclure dans HTML:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

4. Initialiser:
   const supabaseAdapter = new SupabaseStorageAdapter(
     'https://votre-projet.supabase.co',
     'votre-anon-key'
   );
   universalStorage.switchAdapter(supabaseAdapter);

CONFIGURATION FIREBASE (À faire plus tard):

1. Créer un projet Firebase: https://console.firebase.google.com
2. Activer Realtime Database
3. Inclure dans HTML:
   <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js"></script>
   <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-database.js"></script>

4. Initialiser:
   const firebaseAdapter = new FirebaseStorageAdapter({
     apiKey: "...",
     projectId: "...",
     databaseURL: "..."
   });
   universalStorage.switchAdapter(firebaseAdapter);

MIGRATION DE DONNÉES:

// Exporter depuis localStorage
const data = await universalStorage.adapter.getAllKeys();
const exportedData = {};
for (const key of data) {
  exportedData[key] = await universalStorage.adapter.getData(key);
}
console.log(JSON.stringify(exportedData));

// Importer dans nouvelle DB
for (const [key, value] of Object.entries(importedData)) {
  await universalStorage.adapter.setData(key, value);
}

*/
