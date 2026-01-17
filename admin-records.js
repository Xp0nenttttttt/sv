// Admin Record Management
const ADMIN_PASSWORD = 'SV2026';
let currentRecordTab = 'pending';

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('recordAdminLoginForm');
    loginForm.addEventListener('submit', handleRecordAdminLogin);

    if (sessionStorage.getItem('recordAdminSession') === 'active') {
        showRecordAdminPanel();
    }
});

function handleRecordAdminLogin(e) {
    e.preventDefault();
    const password = document.getElementById('recordAdminPassword').value;
    const errorDiv = document.getElementById('recordAdminLoginError');

    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('recordAdminSession', 'active');
        document.getElementById('recordAdminPassword').value = '';
        errorDiv.classList.add('hidden');
        showRecordAdminPanel();
    } else {
        errorDiv.textContent = '❌ Mot de passe incorrect';
        errorDiv.classList.remove('hidden');
    }
}

function showRecordAdminPanel() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('recordAdminPanel').classList.remove('hidden');
    loadRecordSubmissions();
}

function logoutRecordAdmin() {
    sessionStorage.removeItem('recordAdminSession');
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('recordAdminPanel').classList.add('hidden');
}

function loadRecordSubmissions() {
    recordSubmissionManager.getStats()
        .then(stats => {
            document.getElementById('pendingRecordCount').textContent = stats.pending;
            document.getElementById('acceptedRecordCount').textContent = stats.accepted;
            document.getElementById('rejectedRecordCount').textContent = stats.rejected;
            displayRecordSubmissions(currentRecordTab);
        })
        .catch(err => console.error('Erreur chargement stats:', err));
}

function switchRecordTab(tab) {
    currentRecordTab = tab;

    // Update active tab button
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    displayRecordSubmissions(tab);
}

async function displayRecordSubmissions(status) {
    const container = document.getElementById('recordSubmissionsContainer');
    const submissions = (await recordSubmissionManager.getSubmissions())
        .filter(s => s.status === status)
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    if (submissions.length === 0) {
        container.innerHTML = `
            <div class="no-submissions">
                <p>Aucune soumission ${status === 'pending' ? 'en attente' : status === 'accepted' ? 'acceptée' : 'rejetée'}</p>
            </div>
        `;
        return;
    }

    // Charger les noms des niveaux
    const manager = new SubmissionManager();
    const allLevels = (await manager.getSubmissions()).filter(s => s.status === 'accepted');

    container.innerHTML = submissions.map(submission => {
        const level = allLevels.find(l => l.id === submission.levelId);
        const levelName = level ? level.levelName : `Niveau #${submission.levelId}`;

        return `
            <div class="submission-card">
                <div class="submission-header">
                    <div class="submission-title">
                        Record sur: <strong>${levelName}</strong>
                    </div>
                    <div class="submission-status status-${status}">
                        ${status === 'pending' ? '⏳ En attente' : status === 'accepted' ? '✅ Accepté' : '❌ Rejeté'}
                    </div>
                </div>

                <div class="submission-meta">
                    <div class="meta-item">
                        <span class="meta-label">👤 Joueur:</span>
                        <span class="meta-value">${escapeHtml(submission.player)}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">📊 Pourcentage:</span>
                        <span class="meta-value record-percentage">${submission.percentage}%</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">🎮 Plateforme:</span>
                        <span class="meta-value">${submission.device}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">📅 Soumis le:</span>
                        <span class="meta-value">${new Date(submission.submittedAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                </div>

                ${submission.videoLink ? `
                    <div class="submission-video">
                        <a href="${submission.videoLink}" target="_blank" class="btn-video-preview">
                            🎥 Voir la vidéo de preuve
                        </a>
                    </div>
                ` : ''}

                <div class="submission-actions">
                    ${status === 'pending' ? `
                        <button class="btn-accept" onclick="acceptRecord(${submission.id})">
                            ✅ Accepter
                        </button>
                        <button class="btn-reject" onclick="rejectRecord(${submission.id})">
                            ❌ Rejeter
                        </button>
                    ` : ''}
                    <button class="btn-delete" onclick="deleteRecordSubmission(${submission.id})">
                        🗑️ Supprimer
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function acceptRecord(submissionId) {
    if (confirm('Accepter ce record ?')) {
        recordSubmissionManager.acceptSubmission(submissionId);
        // Vider le cache du classement pour forcer le rechargement
        if (typeof leaderboardManager !== 'undefined') {
            leaderboardManager.clearCache();
        }
        loadRecordSubmissions();
        alert('✅ Record accepté et ajouté au niveau !');
    }
}

function rejectRecord(submissionId) {
    if (confirm('Rejeter ce record ?')) {
        recordSubmissionManager.rejectSubmission(submissionId);
        loadRecordSubmissions();
    }
}

function deleteRecordSubmission(submissionId) {
    if (confirm('Supprimer définitivement cette soumission ?')) {
        recordSubmissionManager.deleteSubmission(submissionId);
        loadRecordSubmissions();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
