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
                const data = await universalStorage.getData(this.storageKey);
                console.log(`[RecordSubmissionManager] getData returned:`, data, `type: ${typeof data}`);

                // Assurer que c'est toujours un array
                if (Array.isArray(data)) {
                    return data;
                } else if (data && typeof data === 'object') {
                    // Si c'est un objet, le convertir en array
                    console.warn('⚠️ Data est un objet, pas un array - conversion:', data);
                    return Object.values(data);
                } else if (!data) {
                    return [];
                }

                return data || [];
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
            // Ne mettre à jour acceptedAt que si elle n'existe pas déjà
            if (!submission.acceptedAt) {
                submission.acceptedAt = new Date().toISOString();
            }
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
