// Gestionnaire de synchronisation avec Supabase
class DataSyncManager {
    constructor() {
        this.supabase = null;
    }

    // Obtenir le client Supabase
    async getSupabaseClient() {
        if (this.supabase) return this.supabase;

        // Attendre que Supabase soit initialisé
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            this.supabase = supabaseClient;
            return this.supabase;
        }

        throw new Error('Supabase client non disponible. Appelez enableSupabaseStorage() d\'abord');
    }

    // Charger les niveaux acceptés depuis Supabase ou universalStorage
    async loadLevels() {
        try {
            // D'abord essayer de charger depuis universalStorage (storage_data table)
            if (typeof universalStorage !== 'undefined' && universalStorage) {
                try {
                    const levels = await universalStorage.getData('svChallengeSubmissions');
                    if (levels && levels.length > 0) {
                        // Filtrer pour avoir les acceptés seulement
                        const accepted = levels.filter(l => l.status === 'accepted');
                        console.log(`✅ ${accepted.length} niveaux chargés depuis Supabase storage_data`);
                        return accepted;
                    }
                } catch (storageErr) {
                    console.warn('⚠️ Impossible de charger depuis storage_data:', storageErr.message);
                }
            }

            // Pas de fallback - les données sont dans storage_data
            console.log('⚠️ Aucun niveau trouvé dans storage_data');
            return [];
        } catch (err) {
            console.error('❌ Impossible de charger les niveaux depuis Supabase:', err);
            throw err;
        }
    }

    // Charger les records acceptés depuis Supabase ou universalStorage
    async loadRecords() {
        try {
            // D'abord essayer de charger depuis universalStorage (storage_data table)
            if (typeof universalStorage !== 'undefined' && universalStorage) {
                try {
                    const records = await universalStorage.getData('svChallengeRecordSubmissions');
                    if (records && records.length > 0) {
                        // Filtrer pour avoir les acceptés seulement
                        const accepted = records.filter(r => r.status === 'accepted');
                        console.log(`✅ ${accepted.length} records chargés depuis Supabase storage_data`);
                        return accepted;
                    }
                } catch (storageErr) {
                    console.warn('⚠️ Impossible de charger depuis storage_data:', storageErr.message);
                }
            }

            // Pas de fallback - les données sont dans storage_data
            console.log('⚠️ Aucun record trouvé dans storage_data');
            return [];
        } catch (err) {
            console.error('❌ Impossible de charger les records depuis Supabase:', err);
            throw err;
        }
    }

    // Exporter les données pour commit GitHub
    exportForGitHub() {
        const manager = new SubmissionManager();
        const recordManager = new RecordSubmissionManager();

        const levels = manager.getAcceptedSubmissions();
        const records = recordManager.getSubmissions().filter(s => s.status === 'accepted');

        const levelsJson = JSON.stringify(levels, null, 2);
        const recordsJson = JSON.stringify(records, null, 2);

        // Télécharger les fichiers
        this.downloadFile('levels.json', levelsJson);
        this.downloadFile('records.json', recordsJson);

        alert('✅ Fichiers téléchargés !\n\n' +
            '1. Copie levels.json et records.json dans le dossier data/\n' +
            '2. Commit et push sur GitHub\n' +
            '3. Les données seront synchronisées sur tous les PCs');
    }

    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Instance globale
const dataSyncManager = new DataSyncManager();
