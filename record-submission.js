// Gestionnaire de soumissions de records
class RecordSubmissionManager {
    constructor() {
        this.storageKey = 'svChallengeRecordSubmissions';
    }

    // Soumettre un nouveau record
    submitRecord(levelId, recordData) {
        const submissions = this.getSubmissions();
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
        localStorage.setItem(this.storageKey, JSON.stringify(submissions));
        return newSubmission;
    }

    // Récupérer toutes les soumissions
    getSubmissions() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
    }

    // Récupérer les soumissions pour un niveau spécifique
    getSubmissionsForLevel(levelId) {
        return this.getSubmissions().filter(s => s.levelId === levelId);
    }

    // Accepter une soumission de record
    acceptSubmission(submissionId) {
        const submissions = this.getSubmissions();
        const submission = submissions.find(s => s.id === submissionId);
        if (submission) {
            submission.status = 'accepted';
            submission.acceptedAt = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(submissions));

            // Ajouter le record au niveau
            const recordsKey = `level_records_${submission.levelId}`;
            const recordsData = localStorage.getItem(recordsKey);
            const records = recordsData ? JSON.parse(recordsData) : [];

            const newRecord = {
                id: Date.now(),
                player: submission.player,
                percentage: submission.percentage,
                videoLink: submission.videoLink,
                device: submission.device,
                submittedAt: submission.acceptedAt
            };

            records.push(newRecord);
            records.sort((a, b) => b.percentage - a.percentage);
            localStorage.setItem(recordsKey, JSON.stringify(records));
        }
        return submission;
    }

    // Rejeter une soumission
    rejectSubmission(submissionId) {
        const submissions = this.getSubmissions();
        const submission = submissions.find(s => s.id === submissionId);
        if (submission) {
            submission.status = 'rejected';
            submission.rejectedAt = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(submissions));
        }
        return submission;
    }

    // Supprimer une soumission
    deleteSubmission(submissionId) {
        let submissions = this.getSubmissions();
        submissions = submissions.filter(s => s.id !== submissionId);
        localStorage.setItem(this.storageKey, JSON.stringify(submissions));
    }

    // Obtenir les statistiques
    getStats() {
        const submissions = this.getSubmissions();
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
