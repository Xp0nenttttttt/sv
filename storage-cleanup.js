// Utilitaire de nettoyage et gestion du localStorage
class StorageManager {
    constructor() {
        this.quotaEstimate = 5 * 1024 * 1024; // 5MB par défaut
    }

    // Calculer la taille utilisée du localStorage
    getStorageSize() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return total;
    }

    // Obtenir le pourcentage d'utilisation
    getStorageUsage() {
        const used = this.getStorageSize();
        const percentage = (used / this.quotaEstimate) * 100;
        return {
            used: this.formatBytes(used),
            total: this.formatBytes(this.quotaEstimate),
            percentage: percentage.toFixed(1)
        };
    }

    // Afficher les détails du stockage
    getStorageBreakdown() {
        const breakdown = {};
        let total = 0;

        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                const size = localStorage[key].length;
                breakdown[key] = this.formatBytes(size);
                total += size;
            }
        }

        breakdown['TOTAL'] = this.formatBytes(total);
        return breakdown;
    }

    // Convertir en bytes lisibles
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    // Nettoyer les images Base64 de grande taille des soumissions
    cleanupLargeImages() {
        const submissionManager = new SubmissionManager();
        const submissions = submissionManager.getSubmissions();
        let cleaned = 0;

        submissions.forEach(submission => {
            if (submission.imageUrl && submission.imageUrl.startsWith('data:')) {
                // Garder seulement une petite version ou remplacer par une URL de placeholder
                submission.imageUrl = 'image/svkawai.png'; // Image par défaut
                cleaned++;
            }
        });

        if (cleaned > 0) {
            localStorage.setItem(submissionManager.storageKey, JSON.stringify(submissions));
        }

        return cleaned;
    }

    // Supprimer les soumissions rejetées (pour libérer de l'espace)
    removeRejectedSubmissions() {
        const submissionManager = new SubmissionManager();
        const recordManager = new RecordSubmissionManager();

        const submissions = submissionManager.getSubmissions().filter(s => s.status !== 'rejected');
        const records = recordManager.getSubmissions().filter(r => r.status !== 'rejected');

        localStorage.setItem(submissionManager.storageKey, JSON.stringify(submissions));
        localStorage.setItem(recordManager.storageKey, JSON.stringify(records));

        return {
            submissions: submissions.length,
            records: records.length
        };
    }

    // Supprimer les données dupliquées ou obsolètes
    cleanupObsoleteData() {
        const keys = Object.keys(localStorage);
        let removed = 0;

        keys.forEach(key => {
            // Supprimer les anciennes clés d'historique ou les données temporaires
            if (key.includes('_OLD') || key.includes('_TEMP') || key.includes('_BACKUP')) {
                localStorage.removeItem(key);
                removed++;
            }
        });

        return removed;
    }

    // Compresser les données en supprimant les données redondantes
    optimizeSubmissions() {
        const submissionManager = new SubmissionManager();
        const submissions = submissionManager.getSubmissions();

        // Garder seulement les données acceptées et les soumissions en attente
        const optimized = submissions.filter(s =>
            s.status === 'accepted' || s.status === 'pending'
        );

        // Nettoyer les champs inutiles des anciennes soumissions
        optimized.forEach(sub => {
            if (sub.status === 'accepted') {
                // Supprimer certains champs temporaires ou métadonnées non essentielles
                delete sub.editHistory;
                delete sub.tempData;
            }
        });

        localStorage.setItem(submissionManager.storageKey, JSON.stringify(optimized));
        return optimized.length;
    }

    // Exécuter un nettoyage complet
    fullCleanup() {
        const results = {
            imagesCleaned: this.cleanupLargeImages(),
            rejectedRemoved: this.removeRejectedSubmissions(),
            obsoleteRemoved: this.cleanupObsoleteData(),
            submissionsOptimized: this.optimizeSubmissions(),
            beforeSize: null,
            afterSize: null
        };

        results.afterSize = this.getStorageSize();
        return results;
    }

    // Créer un rapport détaillé
    generateReport() {
        const usage = this.getStorageUsage();
        const breakdown = this.getStorageBreakdown();

        return {
            usage: usage,
            breakdown: breakdown,
            recommendation: usage.percentage > 80 ?
                '⚠️ CRITIQUE: Plus de 80% d\'espace utilisé. Nettoyage immédiat recommandé.' :
                usage.percentage > 50 ?
                    '⚠️ ATTENTION: Plus de 50% d\'espace utilisé. Un nettoyage est recommandé.' :
                    '✅ OK: L\'espace disponible est suffisant.'
        };
    }
}

// Utilitaire global
let storageManager = new StorageManager();

// === AFFICHER LE RAPPORT AU CHARGEMENT ===
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier l'espace seulement si on est en mode admin
    if (window.location.pathname.includes('admin')) {
        checkStorageQuota();
    }
});

// Vérifier et alerter si le quota approche
function checkStorageQuota() {
    const usage = storageManager.getStorageUsage();
    const percentage = parseFloat(usage.percentage);

    if (percentage > 90) {
        console.error('🔴 CRITICAL: Storage quota critical!', usage);
        console.error('Recommendation: Run storageManager.fullCleanup()');
    } else if (percentage > 70) {
        console.warn('🟠 WARNING: Storage quota high!', usage);
        console.warn('Run: storageManager.fullCleanup()');
    } else {
        console.log('🟢 Storage OK:', usage);
    }
}

// === COMMANDES DE NETTOYAGE ===
// À exécuter dans la console du navigateur pour libérer de l'espace:
// storageManager.fullCleanup()
// storageManager.removeRejectedSubmissions()
// storageManager.cleanupLargeImages()
// storageManager.generateReport()
