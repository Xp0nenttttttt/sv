// Gestion des soumissions de niveaux
class SubmissionManager {
    constructor() {
        this.storageKey = 'svChallengeSubmissions';
        this.admins = {
            'admin': 'SV2026' // À changer !
        };
    }

    // Sauvegarde locale fallback pour éviter de perdre les soumissions si Supabase n'est pas prêt
    saveLocal(submissions) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(submissions));
        } catch (err) {
            console.warn('⚠️ Impossible de sauvegarder en localStorage:', err.message);
        }
    }

    // Lecture locale fallback
    loadLocal() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            return raw ? JSON.parse(raw) : [];
        } catch (err) {
            console.warn('⚠️ Impossible de lire le localStorage:', err.message);
            return [];
        }
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
            console.error('❌ Supabase non initialisé - sauvegarde locale uniquement');
            this.saveLocal(submissions);
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
                const data = (await universalStorage.getData(this.storageKey)) || [];
                // Garder une copie locale en cache
                this.saveLocal(data);
                return data;
            } catch (err) {
                console.warn('⚠️ Erreur Supabase, fallback localStorage:', err.message);
                return this.loadLocal();
            }
        }

        console.warn('⚠️ Supabase non initialisé après attente, usage du localStorage');
        return this.loadLocal();
    }

    // Mettre à jour le statut d'une soumission
    async updateSubmissionStatus(id, status, approvedRank = null, difficulty = null) {
        const submissions = await this.getSubmissions();
        const submission = submissions.find(s => s.id === id);
        if (submission) {
            submission.status = status;
            if (status === 'accepted') {
                // Ne mettre à jour acceptedAt que si elle n'existe pas déjà
                if (!submission.acceptedAt) {
                    submission.acceptedAt = new Date().toISOString();
                }
                submission.approvedRank = approvedRank;
                submission.approvedDifficulty = difficulty;
            }
            if (universalStorage) {
                await universalStorage.setData(this.storageKey, submissions);
            } else {
                console.error('❌ Supabase non initialisé - sauvegarde locale uniquement');
                this.saveLocal(submissions);
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
            console.error('❌ Supabase non initialisé - suppression locale uniquement');
            this.saveLocal(submissions);
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
