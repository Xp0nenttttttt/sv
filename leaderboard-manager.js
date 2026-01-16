// Gestionnaire des classements
class LeaderboardManager {
    constructor() {
        this.submissionManager = new SubmissionManager();
        this.recordSubmissionManager = new RecordSubmissionManager();
    }

    // Obtenir le classement combiné (joueurs + vérificateurs)
    async getCombinedLeaderboard() {
        const players = await this.getPlayersLeaderboard();
        const verifiers = await this.getVerifiersLeaderboard();

        // Créer un map pour fusionner les données
        const combined = {};

        // Ajouter les joueurs
        players.forEach(player => {
            const key = player.name.toLowerCase();
            combined[key] = {
                type: 'player',
                name: player.name,
                country: player.country || '',
                region: player.region || '',
                totalPoints: player.totalPoints,
                recordsCount: player.recordsCount,
                maxPercentage: player.maxPercentage,
                records: player.records,
                levelsVerified: 0,
                levels: [],
                details: `${player.recordsCount} record${player.recordsCount > 1 ? 's' : ''}`
            };
        });

        // Ajouter ou fusionner les vérificateurs
        verifiers.forEach(verifier => {
            const key = verifier.name.toLowerCase();
            if (combined[key]) {
                // La personne est déjà dans la liste (joueur + vérificateur)
                combined[key].type = 'both';
                combined[key].totalPoints += verifier.totalPoints;
                combined[key].levelsVerified = verifier.levelsVerified;
                combined[key].levels = verifier.levels;
                // Prendre le pays/région du vérificateur si le joueur n'en a pas
                if (!combined[key].country && verifier.country) {
                    combined[key].country = verifier.country;
                    combined[key].region = verifier.region;
                }
                combined[key].details = `${combined[key].recordsCount} record${combined[key].recordsCount > 1 ? 's' : ''} + ${verifier.levelsVerified} niveau${verifier.levelsVerified > 1 ? 'x' : ''} vérifié${verifier.levelsVerified > 1 ? 's' : ''}`;
            } else {
                // Nouvelle personne (vérificateur seulement)
                combined[key] = {
                    type: 'verifier',
                    name: verifier.name,
                    country: verifier.country || '',
                    region: verifier.region || '',
                    totalPoints: verifier.totalPoints,
                    recordsCount: 0,
                    maxPercentage: 0,
                    records: [],
                    levelsVerified: verifier.levelsVerified,
                    levels: verifier.levels,
                    details: `${verifier.levelsVerified} niveau${verifier.levelsVerified > 1 ? 'x' : ''} vérifié${verifier.levelsVerified > 1 ? 's' : ''}`
                };
            }
        });

        // Convertir en tableau et trier par points totaux
        return Object.values(combined).sort((a, b) => b.totalPoints - a.totalPoints);
    }

    // Obtenir le classement des vérificateurs
    async getVerifiersLeaderboard() {
        let allSubmissions;

        // Utiliser DataSyncManager si disponible
        if (typeof dataSyncManager !== 'undefined') {
            allSubmissions = await dataSyncManager.loadLevels();
        } else {
            allSubmissions = this.submissionManager.getSubmissions()
                .filter(s => s.status === 'accepted');
        }

        const verifiers = {};

        allSubmissions.forEach(submission => {
            const verifier = submission.authorName;
            if (!verifiers[verifier]) {
                verifiers[verifier] = {
                    name: verifier,
                    country: submission.playerCountry || '',
                    region: submission.playerRegion || '',
                    levelsVerified: 0,
                    totalPoints: 0,
                    levels: []
                };
            }
            verifiers[verifier].levelsVerified += 1;

            // Calculer les points du niveau
            const points = this.calculateLevelPoints(submission.approvedRank);
            verifiers[verifier].totalPoints += points;

            verifiers[verifier].levels.push({
                levelName: submission.levelName,
                levelId: submission.id,
                points: points,
                rank: submission.approvedRank
            });
        });

        // Convertir en tableau et trier
        return Object.values(verifiers)
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .map(verifier => ({
                ...verifier,
                levels: verifier.levels.sort((a, b) => b.points - a.points)
            }));
    }

    // Obtenir le classement des joueurs
    async getPlayersLeaderboard() {
        let acceptedRecords;
        let allSubmissions;

        // Utiliser DataSyncManager si disponible
        if (typeof dataSyncManager !== 'undefined') {
            acceptedRecords = await dataSyncManager.loadRecords();
            allSubmissions = await dataSyncManager.loadLevels();
        } else {
            acceptedRecords = this.recordSubmissionManager.getSubmissions()
                .filter(s => s.status === 'accepted');
            allSubmissions = this.submissionManager.getSubmissions()
                .filter(s => s.status === 'accepted');
        }

        const players = {};

        acceptedRecords.forEach(record => {
            const player = record.player;
            if (!players[player]) {
                players[player] = {
                    name: player,
                    country: record.playerCountry || '',
                    region: record.playerRegion || '',
                    recordsCount: 0,
                    totalPoints: 0,
                    maxPercentage: 0,
                    records: []
                };
            }

            // Trouver le niveau
            const allSubmissions = this.submissionManager.getSubmissions()
                .filter(s => s.status === 'accepted');
            const level = allSubmissions.find(s => s.id === record.levelId);

            if (level) {
                const points = this.calculateLevelPoints(level.approvedRank);
                players[player].recordsCount += 1;
                players[player].totalPoints += points;
                players[player].maxPercentage = Math.max(players[player].maxPercentage, record.percentage);

                players[player].records.push({
                    levelName: level.levelName,
                    levelId: level.id,
                    percentage: record.percentage,
                    points: points,
                    device: record.device,
                    rank: level.approvedRank
                });
            }
        });

        // Convertir en tableau et trier
        return Object.values(players)
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .map(player => ({
                ...player,
                records: player.records.sort((a, b) => b.points - a.points)
            }));
    }

    // Calculer les points d'un niveau selon son rang
    calculateLevelPoints(rank) {
        if (rank === 1) return 150;
        if (rank <= 10) return 150 - (rank - 1) * 5;
        if (rank <= 50) return 100 - (rank - 10) * 2;
        if (rank <= 100) return 20 - Math.floor((rank - 50) / 10);
        return 10;
    }

    // Obtenir les statistiques globales
    async getGlobalStats() {
        let allSubmissions;
        let acceptedRecords;

        // Utiliser DataSyncManager si disponible
        if (typeof dataSyncManager !== 'undefined') {
            allSubmissions = await dataSyncManager.loadLevels();
            acceptedRecords = await dataSyncManager.loadRecords();
        } else {
            allSubmissions = this.submissionManager.getSubmissions();
            acceptedRecords = this.recordSubmissionManager.getSubmissions()
                .filter(s => s.status === 'accepted');
        }

        // Compter joueurs et vérificateurs ensemble
        const playersSet = new Set(acceptedRecords.map(r => r.player));
        const verifiersSet = new Set(allSubmissions.map(s => s.authorName));
        const allParticipants = new Set([...playersSet, ...verifiersSet]);

        return {
            totalLevels: allSubmissions.length,
            totalRecords: acceptedRecords.length,
            totalPlayers: allParticipants.size,
            pendingLevels: 0,
            pendingRecords: 0
        };
    }
}

// Rendre disponible globalement
const leaderboardManager = new LeaderboardManager();
