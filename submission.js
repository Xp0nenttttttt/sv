// Gestion des soumissions de niveaux
class SubmissionManager {
    constructor() {
        this.storageKey = 'svChallengeSubmissions';
        this.admins = {
            'admin': 'SV2026' // À changer !
        };
    }

    // Ajouter une soumission
    addSubmission(data) {
        const submissions = this.getSubmissions();
        const newSubmission = {
            id: Date.now(),
            ...data,
            tags: data.tags || [],
            status: 'pending',
            submittedAt: new Date().toISOString(),
            approvedRank: null, // Sera défini par l'admin à l'acceptation
            imageUrl: 'image/svkawai.png' // NE PAS stocker les images Base64, utiliser l'image par défaut
        };

        // Supprimer les données volumineuses qui ne doivent pas être stockées
        delete newSubmission.imageData;
        delete newSubmission.videoFile;

        submissions.push(newSubmission);
        if (typeof universalStorage !== 'undefined') {
            universalStorage.setData(this.storageKey, submissions);
        } else {
            localStorage.setItem(this.storageKey, JSON.stringify(submissions));
        }
        return newSubmission;
    }

    // Récupérer toutes les soumissions
    getSubmissions() {
        if (typeof universalStorage !== 'undefined' && typeof universalStorage.getData === 'function') {
            // Mode synchrone pour compatibilité - getData retourne depuis le cache
            const data = universalStorage.cache[this.storageKey];
            return data || [];
        }
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
    }

    // Mettre à jour le statut d'une soumission avec rang et difficulté optionnels
    updateSubmissionStatus(id, status, approvedRank = null, difficulty = null) {
        const submissions = this.getSubmissions();
        const submission = submissions.find(s => s.id === id);
        if (submission) {
            submission.status = status;
            if (status === 'accepted') {
                submission.acceptedAt = new Date().toISOString();
                submission.approvedRank = approvedRank;
                submission.approvedDifficulty = difficulty; // La difficulté choisie par l'admin
            }
            if (typeof universalStorage !== 'undefined') {
                universalStorage.setData(this.storageKey, submissions);
            } else {
                localStorage.setItem(this.storageKey, JSON.stringify(submissions));
            }
        }
        return submission;
    }

    // Supprimer une soumission
    deleteSubmission(id) {
        let submissions = this.getSubmissions();
        submissions = submissions.filter(s => s.id !== id);
        if (typeof universalStorage !== 'undefined') {
            universalStorage.setData(this.storageKey, submissions);
        } else {
            localStorage.setItem(this.storageKey, JSON.stringify(submissions));
        }
    }

    // Obtenir les soumissions acceptées
    getAcceptedSubmissions() {
        return this.getSubmissions().filter(s => s.status === 'accepted');
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
