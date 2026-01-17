// Admin Accounts Manager - Système de compte unifié
const ADMIN_PASSWORD = 'SV2026';

class Account {
    constructor(data) {
        this.id = data.id || Date.now();
        this.name = data.name;
        this.country = data.country || '';
        this.region = data.region || '';

        // Activités de joueur
        this.isPlayer = data.isPlayer || false;
        this.recordsCount = data.recordsCount || 0;
        this.playerTotalPoints = data.playerTotalPoints || 0;
        this.maxPercentage = data.maxPercentage || 0;
        this.records = data.records || [];

        // Activités de vérificateur
        this.isVerifier = data.isVerifier || false;
        this.levelsVerified = data.levelsVerified || 0;
        this.verifierTotalPoints = data.verifierTotalPoints || 0;
        this.levels = data.levels || [];
    }

    getTotalPoints() {
        return this.playerTotalPoints + this.verifierTotalPoints;
    }

    getType() {
        if (this.isPlayer && this.isVerifier) return 'both';
        if (this.isPlayer) return 'player';
        if (this.isVerifier) return 'verifier';
        return 'inactive';
    }

    getActivitiesHTML() {
        const activities = [];
        if (this.isPlayer) activities.push(`🎮 ${this.recordsCount} record${this.recordsCount > 1 ? 's' : ''}`);
        if (this.isVerifier) activities.push(`✔️ ${this.levelsVerified} niveau${this.levelsVerified > 1 ? 'x' : ''} vérifié${this.levelsVerified > 1 ? 's' : ''}`);
        return activities.join(' • ');
    }
}

class AccountManager {
    constructor() {
        this.recordManager = new RecordSubmissionManager();
        this.submissionManager = new SubmissionManager();
        this.leaderboardManager = new LeaderboardManager();
        this.accounts = [];
        // Lancer loadAccounts async
        this.loadAccounts().catch(err => {
            console.error('Erreur chargement comptes:', err);
        }
    }

    async loadAccounts() {
        // Attendre que Supabase soit prêt
        let attempts = 0;
        while (!universalStorage && attempts < 100) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!universalStorage) {
            console.error('❌ universalStorage pas disponible dans loadAccounts');
            return;
        }

        const accountsMap = {};

        // Charger tous les joueurs
        const allRecords = await this.recordManager.getSubmissions();
        const acceptedRecords = allRecords.filter(s => s.status === 'accepted');
        for (const record of acceptedRecords) {
            const key = record.player.toLowerCase();
            if (!accountsMap[key]) {
                accountsMap[key] = new Account({
                    id: key,
                    name: record.player,
                    country: record.playerCountry || '',
                    region: record.playerRegion || '',
                    isPlayer: true
                });
            }

            const allSubmissions = await this.leaderboardManager.submissionManager.getSubmissions();
            const level = allSubmissions
                .filter(s => s.status === 'accepted')
                .find(s => s.id === record.levelId);

            if (level) {
                const points = this.leaderboardManager.calculateLevelPoints(level.approvedRank);
                accountsMap[key].recordsCount += 1;
                accountsMap[key].playerTotalPoints += points;
                accountsMap[key].maxPercentage = Math.max(accountsMap[key].maxPercentage, record.percentage);
            }
        }

        // Charger tous les vérificateurs
        const allSubmissions = await this.submissionManager.getSubmissions();
        const acceptedSubmissions = allSubmissions.filter(s => s.status === 'accepted');
        for (const submission of acceptedSubmissions) {
            const key = submission.authorName.toLowerCase();
            if (!accountsMap[key]) {
                accountsMap[key] = new Account({
                    id: key,
                    name: submission.authorName,
                    country: submission.playerCountry || '',
                    region: submission.playerRegion || '',
                    isVerifier: true
                });
            } else {
                accountsMap[key].isVerifier = true;
            }

            const points = this.leaderboardManager.calculateLevelPoints(submission.approvedRank);
            accountsMap[key].levelsVerified += 1;
            accountsMap[key].verifierTotalPoints += points;

            accountsMap[key].levels.push({
                levelName: submission.levelName,
                levelId: submission.id,
                points: points,
                rank: submission.approvedRank
            });

            // Mettre à jour le pays/région si vérificateur seulement
            if (!accountsMap[key].isPlayer && submission.playerCountry) {
                accountsMap[key].country = submission.playerCountry;
                accountsMap[key].region = submission.playerRegion || '';
            }
        }

        this.accounts = Object.values(accountsMap).sort((a, b) => b.getTotalPoints() - a.getTotalPoints());
    }

    async updateAccount(originalName, newData) {
        const originalKey = originalName.toLowerCase();
        const allRecords = await this.recordManager.getSubmissions();
        const allSubmissions = await this.submissionManager.getSubmissions();

        // Mettre à jour les joueurs
        allRecords.forEach(record => {
            if (record.player.toLowerCase() === originalKey) {
                record.player = newData.name;
                record.playerCountry = newData.country;
                record.playerRegion = newData.region;
            }
        });

        // Mettre à jour les vérificateurs
        allSubmissions.forEach(submission => {
            if (submission.authorName.toLowerCase() === originalKey) {
                submission.authorName = newData.name;
                submission.playerCountry = newData.country;
                submission.playerRegion = newData.region;
            }
        });

        if (universalStorage) {
            await universalStorage.setData(this.recordManager.storageKey, allRecords);
            await universalStorage.setData(this.submissionManager.storageKey, allSubmissions);
        }
        await this.loadAccounts();
    }

    async deleteAccount(accountName) {
        const accountKey = accountName.toLowerCase();
        const allRecords = await this.recordManager.getSubmissions();
        const allSubmissions = await this.submissionManager.getSubmissions();

        const filteredRecords = allRecords.filter(record => record.player.toLowerCase() !== accountKey);
        const filteredSubmissions = allSubmissions.filter(submission => submission.authorName.toLowerCase() !== accountKey);

        if (universalStorage) {
            await universalStorage.setData(this.recordManager.storageKey, filteredRecords);
            await universalStorage.setData(this.submissionManager.storageKey, filteredSubmissions);
        }
        await this.loadAccounts();
    }

    async mergeAccounts(primaryAccountName, secondaryAccountName) {
        const primaryKey = primaryAccountName.toLowerCase();
        const secondaryKey = secondaryAccountName.toLowerCase();

        const allRecords = await this.recordManager.getSubmissions();
        const allSubmissions = await this.submissionManager.getSubmissions();

        // Fusionner tous les records du compte secondaire au compte primaire
        allRecords.forEach(record => {
            if (record.player.toLowerCase() === secondaryKey) {
                record.player = primaryAccountName;
            }
        });

        // Fusionner tous les niveaux vérifiés du compte secondaire au compte primaire
        allSubmissions.forEach(submission => {
            if (submission.authorName.toLowerCase() === secondaryKey) {
                submission.authorName = primaryAccountName;
            }
        });

        if (universalStorage) {
            await universalStorage.setData(this.recordManager.storageKey, allRecords);
            await universalStorage.setData(this.submissionManager.storageKey, allSubmissions);
        }
        await this.loadAccounts();
    }

    searchAccounts(term) {
        if (!term) return this.accounts;
        return this.accounts.filter(account =>
            account.name.toLowerCase().includes(term.toLowerCase()) ||
            account.country.toLowerCase().includes(term.toLowerCase()) ||
            account.region.toLowerCase().includes(term.toLowerCase())
        );
    }

    getStats() {
        return {
            total: this.accounts.length,
            players: this.accounts.filter(a => a.isPlayer).length,
            verifiers: this.accounts.filter(a => a.isVerifier).length,
            both: this.accounts.filter(a => a.isPlayer && a.isVerifier).length
        };
    }
}

let accountManager;

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', async () => {
    // Attendre que Supabase soit prêt
    let attempts = 0;
    while (!universalStorage && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    if (!universalStorage) {
        console.error('❌ universalStorage pas disponible');
        return;
    }

    console.log('✅ Création AccountManager...');
    accountManager = new AccountManager();
    const loginForm = document.getElementById('accountsLoginForm');
    loginForm.addEventListener('submit', handleAccountsLogin);

    const searchAccount = document.getElementById('searchAccount');
    if (searchAccount) {
        searchAccount.addEventListener('input', (e) => renderAccountsList(e.target.value));
    }
});

function handleAccountsLogin(event) {
    event.preventDefault();
    const password = document.getElementById('accountsPassword').value;
    const loginError = document.getElementById('loginError');

    if (password === ADMIN_PASSWORD) {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('accountsSection').classList.remove('hidden');
        renderAccountsList();
    } else {
        loginError.textContent = '❌ Mot de passe incorrect';
        loginError.classList.remove('hidden');
    }
}

// === AFFICHAGE DES COMPTES ===
function renderAccountsList(searchTerm = '') {
    accountManager.loadAccounts();
    const container = document.getElementById('accountsList');
    const accounts = searchTerm ? accountManager.searchAccounts(searchTerm) : accountManager.accounts;
    const stats = accountManager.getStats();

    // Mettre à jour les stats
    document.getElementById('totalAccounts').textContent = stats.total;
    document.getElementById('activePlayers').textContent = stats.players;
    document.getElementById('activeVerifiers').textContent = stats.verifiers;

    if (accounts.length === 0) {
        container.innerHTML = '<p class="no-data">Aucun compte trouvé</p>';
        return;
    }

    container.innerHTML = accounts.map(account => {
        const typeIcon = account.getType() === 'both' ? '👥' : (account.getType() === 'player' ? '🎮' : '✔️');
        const typeBadge = account.getType() === 'both' ?
            '<span class="account-badge both">Joueur & Vérif</span>' :
            (account.getType() === 'player' ?
                '<span class="account-badge player">Joueur</span>' :
                '<span class="account-badge verifier">Vérificateur</span>');

        return `
            <div class="account-card account-${account.getType()}">
                <div class="account-card-header">
                    <h3>${typeIcon} ${escapeHtml(account.name)}</h3>
                    ${typeBadge}
                </div>

                ${account.country ? `<div class="account-location">📍 ${escapeHtml(account.country)}${account.region ? ` - ${escapeHtml(account.region)}` : ''}</div>` : ''}

                <div class="account-activities">
                    <strong>Activités:</strong>
                    <div class="activities-list">${account.getActivitiesHTML()}</div>
                </div>

                <div class="account-stats-grid">
                    ${account.isPlayer ? `
                        <div class="stat-item-small">
                            <div class="stat-label-small">Points Joueur</div>
                            <div class="stat-value-small">${account.playerTotalPoints}</div>
                        </div>
                        <div class="stat-item-small">
                            <div class="stat-label-small">Max %</div>
                            <div class="stat-value-small">${account.maxPercentage}%</div>
                        </div>
                    ` : ''}
                    ${account.isVerifier ? `
                        <div class="stat-item-small">
                            <div class="stat-label-small">Points Vérif</div>
                            <div class="stat-value-small">${account.verifierTotalPoints}</div>
                        </div>
                    ` : ''}
                    <div class="stat-item-small">
                        <div class="stat-label-small">Total Points</div>
                        <div class="stat-value-small">${account.getTotalPoints()}</div>
                    </div>
                </div>

                ${account.levels.length > 0 ? `
                    <div class="account-preview">
                        <strong>Niveaux vérifiés:</strong>
                        ${account.levels.slice(0, 2).map(level => `
                            <div class="level-preview">• ${escapeHtml(level.levelName)}</div>
                        `).join('')}
                        ${account.levels.length > 2 ? `<div class="more-levels">+${account.levels.length - 2} autre${account.levels.length - 2 > 1 ? 's' : ''}</div>` : ''}
                    </div>
                ` : ''}

                <div class="player-actions">
                    <button class="btn-secondary" onclick="editAccountName('${escapeHtml(account.name)}')">✏️ Nom</button>
                    <button class="btn-secondary" onclick="editAccountLocation('${escapeHtml(account.name)}')">📍 Lieu</button>
                    <button class="btn-secondary" onclick="mergeAccount('${escapeHtml(account.name)}')">🔗 Fusionner</button>
                    <button class="btn-delete" onclick="deleteAccount('${escapeHtml(account.name)}')">🗑️ Supprimer</button>
                </div>
            </div>
        `;
    }).join('');
}

// === ÉDITION DU NOM ===
function editAccountName(accountName) {
    const account = accountManager.accounts.find(a => a.name === accountName);
    if (!account) return;

    const newName = prompt('Nouveau nom du compte:', accountName);
    if (!newName || newName === accountName) return;

    if (accountManager.accounts.some(a => a.name.toLowerCase() === newName.toLowerCase() && a.name !== accountName)) {
        alert('❌ Ce nom de compte existe déjà');
        return;
    }

    accountManager.updateAccount(accountName, {
        name: newName,
        country: account.country,
        region: account.region
    });

    renderAccountsList();
    alert(`✅ Compte "${accountName}" renommé en "${newName}"`);
}

// === MODIFICATION DE L'EMPLACEMENT ===
async function editAccountLocation(accountName) {
    const account = accountManager.accounts.find(a => a.name === accountName);
    if (!account) return;

    const newCountry = prompt('Pays:', account.country || '');
    if (newCountry === null) return; // Annulé

    const newRegion = prompt('Région:', account.region || '');
    if (newRegion === null) return; // Annulé

    await accountManager.updateAccount(accountName, {
        name: accountName,
        country: newCountry.trim() || '',
        region: newRegion.trim() || ''
    });

    renderAccountsList();
    alert(`✅ Emplacement de "${accountName}" mis à jour`);
}

// === SUPPRESSION DE COMPTE ===
async function deleteAccount(accountName) {
    const account = accountManager.accounts.find(a => a.name === accountName);
    if (!account) return;

    const activities = account.getActivitiesHTML();
    if (!confirm(`❓ Êetes-vous sûr de vouloir supprimer le compte "${accountName}" ?\n\n${activities}\n\nCette action supprimera tous ses records et/ou niveaux vérifiés.`)) {
        return;
    }

    await accountManager.deleteAccount(accountName);
    renderAccountsList();
    alert(`✅ Compte "${accountName}" supprimé`);
}

// === FUSION DE COMPTES ===
async function mergeAccount(primaryAccountName) {
    const primaryAccount = accountManager.accounts.find(a => a.name === primaryAccountName);
    if (!primaryAccount) return;

    // Créer une liste des autres comptes
    const otherAccounts = accountManager.accounts.filter(a => a.name !== primaryAccountName);

    if (otherAccounts.length === 0) {
        alert('❌ Aucun autre compte à fusionner');
        return;
    }

    // Créer un prompt avec la liste des comptes disponibles
    let accountList = 'Sélectionnez le compte à fusionner avec "' + primaryAccountName + '":\n\n';
    otherAccounts.forEach((acc, idx) => {
        accountList += `${idx + 1}. ${acc.name} (${acc.getActivitiesHTML()})\n`;
    });
    accountList += '\nEntrez le numéro du compte ou son nom:';

    const selection = prompt(accountList);
    if (!selection) return;

    let secondaryAccountName = null;

    // Vérifier si c'est un numéro
    const index = parseInt(selection) - 1;
    if (!isNaN(index) && index >= 0 && index < otherAccounts.length) {
        secondaryAccountName = otherAccounts[index].name;
    } else {
        // Sinon, chercher par nom (case-insensitive)
        secondaryAccountName = otherAccounts.find(acc =>
            acc.name.toLowerCase() === selection.toLowerCase()
        )?.name;
    }

    if (!secondaryAccountName) {
        alert('❌ Compte non trouvé');
        return;
    }

    const secondaryAccount = accountManager.accounts.find(a => a.name === secondaryAccountName);
    const mergedActivities = secondaryAccount.getActivitiesHTML();

    if (!confirm(`Fusionner "${secondaryAccountName}" dans "${primaryAccountName}" ?\n\n${mergedActivities}\n\nTous les records et niveaux vérifiés seront transférés au compte principal.`)) {
        return;
    }

    await accountManager.mergeAccounts(primaryAccountName, secondaryAccountName);
    renderAccountsList();
    alert(`✅ Comptes fusionnés ! "${secondaryAccountName}" a été fusionné dans "${primaryAccountName}"`);
}

// === FONCTION UTILITAIRE ===
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
