// Gestionnaire de synchronisation avec fichiers JSON statiques
class DataSyncManager {
    constructor() {
        this.dataFolder = 'data/';
        this.levelsFile = 'levels.json';
        this.recordsFile = 'records.json';
        this.useLocalStorage = true; // Fallback sur localStorage si fetch échoue
    }

    // Charger les niveaux acceptés depuis JSON ou localStorage
    async loadLevels() {
        try {
            const response = await fetch(this.dataFolder + this.levelsFile);
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Niveaux chargés depuis JSON statique');
                return data;
            }
        } catch (err) {
            console.warn('⚠️ Impossible de charger depuis JSON, fallback localStorage', err);
        }

        // Fallback: localStorage
        const manager = new SubmissionManager();
        const accepted = manager.getAcceptedSubmissions();
        console.log('📦 Niveaux chargés depuis localStorage');
        return accepted;
    }

    // Charger les records acceptés depuis JSON ou localStorage
    async loadRecords() {
        try {
            const response = await fetch(this.dataFolder + this.recordsFile);
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Records chargés depuis JSON statique');
                return data;
            }
        } catch (err) {
            console.warn('⚠️ Impossible de charger depuis JSON, fallback localStorage', err);
        }

        // Fallback: localStorage
        const manager = new RecordSubmissionManager();
        const accepted = manager.getSubmissions().filter(s => s.status === 'accepted');
        console.log('📦 Records chargés depuis localStorage');
        return accepted;
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
