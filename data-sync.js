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

    // Charger les niveaux acceptés depuis Supabase
    async loadLevels() {
        try {
            const client = await this.getSupabaseClient();

            const { data, error } = await client
                .from('submissions')
                .select('*')
                .eq('status', 'accepted')
                .eq('type', 'level');

            if (error) throw error;

            console.log('✅ Niveaux chargés depuis Supabase');
            return data || [];
        } catch (err) {
            console.error('❌ Impossible de charger les niveaux depuis Supabase:', err);
            throw err;
        }
    }

    // Charger les records acceptés depuis Supabase
    async loadRecords() {
        try {
            const client = await this.getSupabaseClient();

            const { data, error } = await client
                .from('submissions')
                .select('*')
                .eq('status', 'accepted')
                .eq('type', 'record');

            if (error) throw error;

            console.log('✅ Records chargés depuis Supabase');
            return data || [];
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
