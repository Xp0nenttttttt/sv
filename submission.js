// Gestion des soumissions de niveaux
class SubmissionManager {
    constructor() {
        this.storageKey = 'svChallengeSubmissions';
        this.admins = {
            'admin': 'SV2026' // À changer !
        };
    }

    // Ajouter une soumission
    async addSubmission(data) {
        const submissions = await this.getSubmissions();
        const newSubmission = {
            id: Date.now(),
            ...data,
            tags: data.tags || [],
            status: 'pending',
            submittedAt: new Date().toISOString(),
            approvedRank: null,
            imageUrl: 'image/svkawai.png'
        };

        // Supprimer les données volumineuses
        delete newSubmission.imageData;
        delete newSubmission.videoFile;

        submissions.push(newSubmission);

        // Sauvegarder dans Supabase uniquement
        if (universalStorage) {
            await universalStorage.setData(this.storageKey, submissions);
        } else {
            throw new Error('Supabase non initialisé');
        }

        return newSubmission;
    }

    // Récupérer toutes les soumissions
    async getSubmissions() {
        if (universalStorage && typeof universalStorage.getData === 'function') {
            return (await universalStorage.getData(this.storageKey)) || [];
        }
        throw new Error('Supabase non initialisé');
    }

    // Mettre à jour le statut d'une soumission
    async updateSubmissionStatus(id, status, approvedRank = null, difficulty = null) {
        const submissions = await this.getSubmissions();
        const submission = submissions.find(s => s.id === id);
        if (submission) {
            submission.status = status;
            if (status === 'accepted') {
                submission.acceptedAt = new Date().toISOString();
                submission.approvedRank = approvedRank;
                submission.approvedDifficulty = difficulty;
            }
            if (universalStorage) {
                await universalStorage.setData(this.storageKey, submissions);
            } else {
                throw new Error('Supabase non initialisé');
            }
        }
        return submission;
    }

    // Supprimer une soumission
    async deleteSubmission(id) {
        let submissions = await this.getSubmissions();
        submissions = submissions.filter(s => s.id !== id);
        if (universalStorage) {
            await universalStorage.setData(this.storageKey, submissions);
        } else {
            throw new Error('Supabase non initialisé');
        }
    }

    // Obtenir les soumissions acceptées
    async getAcceptedSubmissions() {
        const subs = await this.getSubmissions();
        return subs.filter(s => s.status === 'accepted');
    }

    // Convertir une soumission en niveau
    convertSubmissionToLevel(submission, rank) {
        return {
            id: submission.id,
            rank: rank,
            name: submission.levelName,
            creator: submission.creatorName,
            difficulty: submission.difficulty,
            length: submission.length,
            points: parseInt(submission.points),
            author: submission.authorName,
            image: submission.imageUrl || 'image/svkawai.png',
            submittedBy: submission.authorName,
            submittedAt: submission.acceptedAt
        };
    }
}

// Initialiser le gestionnaire
const submissionManager = new SubmissionManager();
