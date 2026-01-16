// Gestion du panel admin

let currentTab = 'pending';
let adminLoggedIn = false;

// Vérifier si admin est connecté
function checkAdminLogin() {
    const token = sessionStorage.getItem('adminToken');
    if (token && token === 'ADMIN_SESSION_VALID') {
        adminLoggedIn = true;
        showAdminPanel();
    } else {
        showLoginForm();
    }
}

// Afficher le formulaire de login
function showLoginForm() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
}

// Afficher le panel admin
async function showAdminPanel() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');

    // Synchroniser depuis JSON d'abord
    await syncFromJSON();

    await loadSubmissions();
    await updateStats();
}

// Gestion du login
document.addEventListener('DOMContentLoaded', async function () {
    // Attendre que Supabase soit initialisé
    console.log('⏳ Admin: attente initialisation Supabase...');
    let attempts = 0;
    while (!universalStorage && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
    }

    if (!universalStorage) {
        console.error('❌ Admin: Supabase non initialisé après attente');
    } else {
        console.log('✅ Admin: Supabase prêt');
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const password = document.getElementById('adminPassword').value;

            // Vérification du mot de passe
            if (submissionManager.admins.admin === password) {
                sessionStorage.setItem('adminToken', 'ADMIN_SESSION_VALID');
                adminLoggedIn = true;
                await showAdminPanel();
                document.getElementById('adminPassword').value = '';
            } else {
                const errorMsg = document.getElementById('loginError');
                errorMsg.textContent = '❌ Mot de passe incorrect';
                errorMsg.classList.remove('hidden');
                setTimeout(() => {
                    errorMsg.classList.add('hidden');
                }, 3000);
            }
        });
    }

    checkAdminLogin();
});

// Déconnexion
function logoutAdmin() {
    sessionStorage.removeItem('adminToken');
    adminLoggedIn = false;
    document.getElementById('adminPassword').value = '';
    showLoginForm();
    document.getElementById('loginError').classList.add('hidden');
}

// Synchroniser avec les JSON au démarrage
async function syncFromJSON() {
    if (typeof dataSyncManager !== 'undefined') {
        try {
            const levels = await dataSyncManager.loadLevels();
            const records = await dataSyncManager.loadRecords();

            // Sauvegarder dans localStorage pour l'admin
            if (levels && levels.length > 0) {
                localStorage.setItem('svChallengeSubmissions', JSON.stringify(levels));
            }
            if (records && records.length > 0) {
                localStorage.setItem('svChallengeRecordSubmissions', JSON.stringify(records));
            }
            console.log('✅ Données synchronisées depuis JSON');
        } catch (err) {
            console.log('ℹ️ Pas de synchronisation JSON disponible');
        }
    }
}

// Charger les soumissions
async function loadSubmissions() {
    const submissions = await submissionManager.getSubmissions();
    const container = document.getElementById('submissionsContainer');

    const filtered = submissions.filter(s => s.status === currentTab);

    if (filtered.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #999; padding: 40px;">Aucune soumission ${getTabLabel(currentTab).toLowerCase()}</p>`;
        return;
    }

    container.innerHTML = filtered.map(submission => `
        <div class="submission-item ${submission.status}">
            <div class="submission-title">${escapeHtml(submission.levelName)}</div>
            
            ${submission.imageUrl ? `<div style="margin: 15px 0;"><img src="${submission.imageUrl}" alt="Preview" style="max-width: 150px; border-radius: 5px;"></div>` : ''}

            <div class="submission-meta">
                <div class="submission-meta-item">
                    <span class="submission-meta-label">Créateur:</span><br>
                    ${escapeHtml(submission.creatorName)}
                </div>
                <div class="submission-meta-item">
                    <span class="submission-meta-label">Auteur record:</span><br>
                    ${escapeHtml(submission.authorName)}
                </div>
                <div class="submission-meta-item">
                    <span class="submission-meta-label">Difficulté:</span><br>
                    ${submission.difficulty} Demon
                </div>
                <div class="submission-meta-item">
                    <span class="submission-meta-label">Longueur:</span><br>
                    ${submission.length}
                </div>
                <div class="submission-meta-item">
                    <span class="submission-meta-label">Top proposé:</span><br>
                    #${submission.proposedTop}
                </div>
            </div>

            ${submission.youtubeLink ? `
                <div style="margin: 15px 0; padding: 10px; background: #f0f0f0; border-left: 3px solid #ff0000; border-radius: 3px;">
                    <strong>🎥 Lien de vérification:</strong><br>
                    <a href="${escapeHtml(submission.youtubeLink)}" target="_blank" style="color: #0066cc; word-break: break-all;">
                        ${escapeHtml(submission.youtubeLink)}
                    </a>
                </div>
            ` : ''}

            ${submission.description ? `<p style="margin: 10px 0; color: #666;"><strong>Description:</strong> ${escapeHtml(submission.description)}</p>` : ''}

            <div style="font-size: 0.9em; color: #999; margin: 10px 0;">
                Soumise le: ${new Date(submission.submittedAt).toLocaleString('fr-FR')}
            </div>

            ${submission.approvedDifficulty ? `<div style="font-size: 0.9em; color: #28a745; margin: 5px 0;"><strong>Difficulté approuvée:</strong> ${submission.approvedDifficulty} Demon</div>` : ''}
            ${submission.approvedRank ? `<div style="font-size: 0.9em; color: #28a745; margin: 5px 0;"><strong>Rang approuvé:</strong> #${submission.approvedRank}</div>` : ''}

            <span class="status-badge status-${submission.status}">
                ${getStatusLabel(submission.status)}
            </span>

            <div class="submission-actions">
                ${submission.status === 'pending' ? `
                    <select id="difficulty-${submission.id}" class="difficulty-select" onchange="updateDifficultyColor(this)">
                        <option value="">Difficulté *</option>
                        <option value="Extreme">Extreme Demon</option>
                        <option value="Hard">Hard Demon</option>
                        <option value="Medium">Medium Demon</option>
                    </select>
                    <input type="number" id="rank-${submission.id}" placeholder="Rang (optionnel)" min="1" style="padding: 10px; border: 2px solid #ddd; border-radius: 5px; flex: 1;">
                    <button class="btn-accept" onclick="acceptSubmission(${submission.id})">✅ Accepter</button>
                    <button class="btn-reject" onclick="rejectSubmission(${submission.id})">⚠️ Rejeter</button>
                    <button class="btn-delete" onclick="deleteSubmission(${submission.id})">🗑️ Supprimer</button>
                ` : `
                    <button class="btn-delete" onclick="deleteSubmission(${submission.id})">🗑️ Supprimer</button>
                `}
            </div>
        </div>
    `).join('');
}

// Accepter une soumission
async function acceptSubmission(id) {
    const difficultySelect = document.getElementById(`difficulty-${id}`);
    const rankInput = document.getElementById(`rank-${id}`);
    const difficulty = difficultySelect ? difficultySelect.value : null;
    const approvedRank = rankInput ? rankInput.value.trim() : null;

    if (!difficulty) {
        alert('❌ Veuillez sélectionner une difficulté');
        return;
    }

    if (confirm('Êtes-vous sûr de vouloir accepter cette soumission ?\n\nDifficulté: ' + difficulty + (approvedRank ? `\nRang: #${approvedRank}` : '\nRang: Pas spécifié'))) {
        await submissionManager.updateSubmissionStatus(id, 'accepted', approvedRank ? parseInt(approvedRank) : null, difficulty);
        await loadSubmissions();
        await updateStats();
    }
}

// Rejeter une soumission
async function rejectSubmission(id) {
    if (confirm('Êtes-vous sûr de vouloir rejeter cette soumission ?')) {
        await submissionManager.updateSubmissionStatus(id, 'rejected');
        await loadSubmissions();
        await updateStats();
    }
}

// Supprimer une soumission
async function deleteSubmission(id) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette soumission définitivement ?')) {
        await submissionManager.deleteSubmission(id);
        await loadSubmissions();
        await updateStats();
    }
}

// Changer d'onglet
async function switchTab(tab) {
    currentTab = tab;

    // Mettre à jour les boutons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    await loadSubmissions();
}

// Mettre à jour les stats
async function updateStats() {
    const submissions = await submissionManager.getSubmissions();
    document.getElementById('pendingCount').textContent = submissions.filter(s => s.status === 'pending').length;
    document.getElementById('acceptedCount').textContent = submissions.filter(s => s.status === 'accepted').length;
    document.getElementById('rejectedCount').textContent = submissions.filter(s => s.status === 'rejected').length;
}

// Utilitaires
function getStatusLabel(status) {
    const labels = {
        'pending': '⏳ En attente',
        'accepted': '✅ Acceptée',
        'rejected': '❌ Rejetée'
    };
    return labels[status] || status;
}

function getTabLabel(tab) {
    const labels = {
        'pending': 'En attente',
        'accepted': 'Acceptées',
        'rejected': 'Rejetées'
    };
    return labels[tab] || tab;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Ajouter des styles pour les onglets et selects
const style = document.createElement('style');
style.textContent = `
    .tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        border-bottom: 2px solid #e0e0e0;
    }

    .tab-button {
        padding: 12px 20px;
        background: transparent;
        border: none;
        border-bottom: 3px solid transparent;
        color: #666;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
    }

    .tab-button:hover {
        color: #667eea;
    }

    .tab-button.active {
        color: #667eea;
        border-bottom-color: #667eea;
    }

    .difficulty-select {
        padding: 10px 15px;
        border: 2px solid #ddd;
        border-radius: 5px;
        flex: 1;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
        color: #333;
        background-color: white;
    }

    .difficulty-select:focus {
        outline: none;
        border-color: #667eea;
    }

    .difficulty-select.extreme {
        background-color: #ff6b6b;
        color: white;
        border-color: #ff6b6b;
    }

    .difficulty-select.extreme option {
        color: #333;
        background-color: white;
    }

    .difficulty-select.hard {
        background-color: #ffa94d;
        color: white;
        border-color: #ffa94d;
    }

    .difficulty-select.hard option {
        color: #333;
        background-color: white;
    }

    .difficulty-select.medium {
        background-color: #74c0fc;
        color: white;
        border-color: #74c0fc;
    }

    .difficulty-select.medium option {
        color: #333;
        background-color: white;
    }

    /* Options générales */
    .difficulty-select option {
        color: #333;
        background-color: white;
        padding: 10px;
        margin: 5px;
    }

    .difficulty-select option:checked {
        background: linear-gradient(#667eea, #667eea);
        background-color: #667eea;
        color: white;
    }
`;
document.head.appendChild(style);

// Fonction pour changer la couleur du select en fonction de la difficulté
function updateDifficultyColor(select) {
    select.className = 'difficulty-select';
    const value = select.value.toLowerCase();
    if (value) {
        select.classList.add(value);
    }
}
