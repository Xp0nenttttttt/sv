// Gestionnaire de soumissions de records
class RecordSubmissionManager {
    constructor() {
        this.storageKey = 'svChallengeRecordSubmissions';
    }

    // Soumettre un nouveau record
    async submitRecord(levelId, recordData) {
        const submissions = await this.getSubmissions();
        const newSubmission = {
            id: Date.now(),
            levelId: levelId,
            player: recordData.player,
            playerCountry: recordData.playerCountry || '',
            playerRegion: recordData.playerRegion || '',
            percentage: parseInt(recordData.percentage),
            videoLink: recordData.videoLink || '',
            device: recordData.device || 'PC',
            status: 'pending',
            submittedAt: new Date().toISOString()
        };
        submissions.push(newSubmission);
        if (universalStorage) {
            await universalStorage.setData(this.storageKey, submissions);
        } else {
            console.error('❌ Supabase non initialisé - record non sauvegardé');
        }
        return newSubmission;
    }

    // Récupérer toutes les soumissions
    async getSubmissions() {
        // Attendre l'initialisation de Supabase
        let attempts = 0;
        while (!universalStorage && attempts < 100) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (universalStorage && typeof universalStorage.getData === 'function') {
            try {
                return (await universalStorage.getData(this.storageKey)) || [];
            } catch (err) {
                console.warn('⚠️ Erreur Supabase, retour vide:', err.message);
                return [];
            }
        }

        console.warn('⚠️ Supabase non initialisé après attente');
        return [];
    }

    // Récupérer les soumissions pour un niveau spécifique
    getSubmissionsForLevel(levelId) {
        return this.getSubmissions().filter(s => s.levelId === levelId);
    }

    // Accepter une soumission de record
    // Accepter une soumission de record
    async acceptSubmission(submissionId) {
        const submissions = await this.getSubmissions();
        const submission = submissions.find(s => s.id === submissionId);
        if (submission) {
            submission.status = 'accepted';
            submission.acceptedAt = new Date().toISOString();
            if (universalStorage) {
                await universalStorage.setData(this.storageKey, submissions);
            } else {
                throw new Error('Supabase non initialisé');
            }
        }
        return submission;
    }

    // Rejeter une soumission
    async rejectSubmission(submissionId) {
        const submissions = await this.getSubmissions();
        const submission = submissions.find(s => s.id === submissionId);
        if (submission) {
            submission.status = 'rejected';
            submission.rejectedAt = new Date().toISOString();
            if (universalStorage) {
                await universalStorage.setData(this.storageKey, submissions);
            } else {
                throw new Error('Supabase non initialisé');
            }
        }
        return submission;
    }

    // Supprimer une soumission
    async deleteSubmission(submissionId) {
        let submissions = await this.getSubmissions();
        submissions = submissions.filter(s => s.id !== submissionId);
        if (universalStorage) {
            await universalStorage.setData(this.storageKey, submissions);
        } else {
            throw new Error('Supabase non initialisé');
        }
    }

    // Obtenir les statistiques
    async getStats() {
        const submissions = await this.getSubmissions();
        return {
            pending: submissions.filter(s => s.status === 'pending').length,
            accepted: submissions.filter(s => s.status === 'accepted').length,
            rejected: submissions.filter(s => s.status === 'rejected').length,
            total: submissions.length
        };
    }
}

// Rendre disponible globalement
const recordSubmissionManager = new RecordSubmissionManager();
