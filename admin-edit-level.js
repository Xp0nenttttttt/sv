// Admin Level Editor
const ADMIN_PASSWORD = 'SV2026';

class LevelEditor {
    constructor() {
        this.level = null;
        this.records = [];
        this.music = null;
    }

    getLevelIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return parseInt(urlParams.get('id'));
    }

    async loadLevel() {
        const levelId = this.getLevelIdFromUrl();
        if (!levelId) {
            this.showError('Aucun niveau spécifié');
            return;
        }

        const manager = new SubmissionManager();
        const allSubmissions = await manager.getSubmissions();
        const submission = allSubmissions.find(s => s.id === levelId && s.status === 'accepted');

        if (!submission) {
            this.showError('Niveau introuvable');
            return;
        }

        this.level = submission;
        this.loadRecords();
        this.loadMusic();
        this.render();
    }

    loadRecords() {
        const storageKey = `level_records_${this.level.id}`;
        const data = universalStorage.getData(storageKey);
        this.records = data ? JSON.parse(data) : [];
    }

    saveRecords() {
        const storageKey = `level_records_${this.level.id}`;
        universalStorage.setData(storageKey, JSON.stringify(this.records));
    }

    loadMusic() {
        const storageKey = `level_music_${this.level.id}`;
        const data = universalStorage.getData(storageKey);
        this.music = data ? JSON.parse(data) : null;
    }

    saveMusic() {
        const storageKey = `level_music_${this.level.id}`;
        if (this.music) {
            universalStorage.setData(storageKey, JSON.stringify(this.music));
        } else {
            universalStorage.removeData(storageKey);
        }
    }

    async updateLevelId(newId) {
        const manager = new SubmissionManager();
        const allSubmissions = await manager.getSubmissions();

        // Vérifier que le nouvel ID n'existe pas déjà
        const existingLevel = allSubmissions.find(s => s.id === parseInt(newId) && s.id !== this.level.id);
        if (existingLevel) {
            alert('❌ Cet ID existe déjà pour un autre niveau');
            return false;
        }

        // Migrer les records et la musique
        const oldRecordsKey = `level_records_${this.level.id}`;
        const oldMusicKey = `level_music_${this.level.id}`;
        const newRecordsKey = `level_records_${newId}`;
        const newMusicKey = `level_music_${newId}`;

        const records = universalStorage.getData(oldRecordsKey);
        const music = universalStorage.getData(oldMusicKey);

        if (records) {
            universalStorage.setData(newRecordsKey, records);
            universalStorage.removeData(oldRecordsKey);
        }

        if (music) {
            universalStorage.setData(newMusicKey, music);
            universalStorage.removeData(oldMusicKey);
        }

        // Mettre à jour le niveau
        const submission = allSubmissions.find(s => s.id === this.level.id);
        if (submission) {
            submission.id = parseInt(newId);
            await manager.updateSubmissionStatus(submission.id, submission.status);
        }

        this.level.id = parseInt(newId);
        alert('✅ ID du niveau modifié avec succès');

        // Rediriger vers la nouvelle URL
        window.location.href = `admin-edit-level.html?id=${newId}`;
        return true;
    }

    addRecord(recordData) {
        const newRecord = {
            id: Date.now(),
            player: recordData.player,
            percentage: parseInt(recordData.percentage),
            videoLink: recordData.videoLink || '',
            device: recordData.device || 'PC',
            submittedAt: new Date().toISOString()
        };
        this.records.push(newRecord);
        this.records.sort((a, b) => b.percentage - a.percentage);
        this.saveRecords();
        this.renderRecords();
    }

    deleteRecord(recordId) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce record ?')) {
            this.records = this.records.filter(r => r.id !== recordId);
            this.saveRecords();
            this.renderRecords();
        }
    }

    updateMusic(musicData) {
        this.music = {
            name: musicData.name,
            artist: musicData.artist,
            link: musicData.link || '',
            newgroundsId: musicData.newgroundsId || ''
        };
        this.saveMusic();
        this.renderMusic();
        alert('✅ Musique mise à jour');
    }

    deleteMusic() {
        if (confirm('Êtes-vous sûr de vouloir supprimer la musique ?')) {
            this.music = null;
            this.saveMusic();
            this.renderMusic();
        }
    }

    showError(message) {
        const container = document.getElementById('levelEditContent');
        container.innerHTML = `
            <div class="error-message">
                <h2>❌ Erreur</h2>
                <p>${message}</p>
                <a href="admin-ranking.html" class="btn-primary">Retour à la gestion</a>
            </div>
        `;
    }

    render() {
        const container = document.getElementById('levelEditContent');
        container.innerHTML = `
            <div class="edit-section">
                <div class="level-header-simple">
                    <h2>${this.level.levelName}</h2>
                    <p>Par ${this.level.creatorName} - Classement #${this.level.approvedRank || 'N/A'}</p>
                </div>

                <!-- ID Section -->
                <div class="edit-card">
                    <h3>🎮 ID du niveau</h3>
                    <div class="edit-id-section">
                        <div class="current-id">
                            <label>ID actuel</label>
                            <div class="id-display">${this.level.id}</div>
                        </div>
                        <div class="id-edit-form">
                            <label for="newLevelId">Nouvel ID</label>
                            <input type="number" id="newLevelId" placeholder="${this.level.id}" min="1">
                            <button class="btn-primary" onclick="levelEditor.handleIdChange()">
                                Modifier l'ID
                            </button>
                        </div>
                    </div>
                    <p class="warning-text">⚠️ Attention : Modifier l'ID changera l'identifiant unique du niveau</p>
                </div>

                <!-- Music Section -->
                <div class="edit-card">
                    <h3>🎵 Musique du niveau</h3>
                    <div id="musicDisplay"></div>
                    <button class="btn-secondary" onclick="levelEditor.toggleMusicForm()">
                        ${this.music ? '✏️ Modifier la musique' : '➕ Ajouter une musique'}
                    </button>
                    <div id="musicForm" class="music-form hidden">
                        <form id="addMusicForm">
                            <div class="form-group">
                                <label for="musicName">Nom de la musique *</label>
                                <input type="text" id="musicName" value="${this.music ? this.music.name : ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="musicArtist">Artiste *</label>
                                <input type="text" id="musicArtist" value="${this.music ? this.music.artist : ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="musicLink">Lien (YouTube, Spotify, etc.)</label>
                                <input type="url" id="musicLink" value="${this.music ? this.music.link : ''}" placeholder="https://...">
                            </div>
                            <div class="form-group">
                                <label for="newgroundsId">ID Newgrounds (optionnel)</label>
                                <input type="text" id="newgroundsId" value="${this.music ? this.music.newgroundsId : ''}" placeholder="12345">
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn-primary">💾 Enregistrer</button>
                                <button type="button" class="btn-secondary" onclick="levelEditor.toggleMusicForm()">Annuler</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Records Section -->
                <div class="edit-card">
                    <div class="records-header">
                        <h3>🏅 Records (${this.records.length})</h3>
                        <button class="btn-primary" onclick="levelEditor.toggleRecordForm()">+ Ajouter un record</button>
                    </div>

                    <div id="recordForm" class="record-form hidden">
                        <h4>Ajouter un nouveau record</h4>
                        <form id="addRecordForm">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="playerName">Joueur *</label>
                                    <input type="text" id="playerName" placeholder="Nom du joueur" required>
                                </div>
                                <div class="form-group">
                                    <label for="recordPercentage">Pourcentage *</label>
                                    <input type="number" id="recordPercentage" min="1" max="100" placeholder="100" required>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="videoLink">Lien vidéo</label>
                                    <input type="url" id="videoLink" placeholder="https://youtube.com/watch?v=...">
                                </div>
                                <div class="form-group">
                                    <label for="deviceType">Plateforme</label>
                                    <select id="deviceType">
                                        <option value="PC">PC</option>
                                        <option value="Mobile">Mobile</option>
                                        <option value="Console">Console</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn-primary">💾 Enregistrer</button>
                                <button type="button" class="btn-secondary" onclick="levelEditor.toggleRecordForm()">Annuler</button>
                            </div>
                        </form>
                    </div>

                    <div id="recordsList"></div>
                </div>
            </div>
        `;

        this.renderMusic();
        this.renderRecords();
        this.setupForms();
    }

    renderMusic() {
        const display = document.getElementById('musicDisplay');
        if (!display) return;

        if (!this.music) {
            display.innerHTML = `
                <div class="no-music">
                    <p>🎼 Aucune musique définie pour ce niveau</p>
                </div>
            `;
        } else {
            display.innerHTML = `
                <div class="music-display-card">
                    <div class="music-info">
                        <div class="music-name">🎵 ${this.music.name}</div>
                        <div class="music-artist">Par ${this.music.artist}</div>
                        ${this.music.newgroundsId ? `<div class="music-ng">ID Newgrounds: ${this.music.newgroundsId}</div>` : ''}
                        ${this.music.link ? `
                            <a href="${this.music.link}" target="_blank" class="music-link">
                                🔗 Écouter la musique
                            </a>
                        ` : ''}
                    </div>
                    <button class="btn-delete-small" onclick="levelEditor.deleteMusic()">🗑️</button>
                </div>
            `;
        }
    }

    renderRecords() {
        const container = document.getElementById('recordsList');
        if (!container) return;

        if (this.records.length === 0) {
            container.innerHTML = `
                <div class="no-records">
                    <p>Aucun record enregistré</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.records.map((record, index) => `
            <div class="record-card ${record.percentage === 100 ? 'record-complete' : ''}">
                <div class="record-rank">#${index + 1}</div>
                <div class="record-info">
                    <div class="record-player">${record.player}</div>
                    <div class="record-meta">
                        <span class="record-percentage">${record.percentage}%</span>
                        <span class="record-device">${record.device}</span>
                        <span class="record-date">${new Date(record.submittedAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                </div>
                <div class="record-actions">
                    ${record.videoLink ? `
                        <a href="${record.videoLink}" target="_blank" class="btn-video">
                            🎥 Vidéo
                        </a>
                    ` : ''}
                    <button class="btn-delete-small" onclick="levelEditor.deleteRecord(${record.id})">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    setupForms() {
        // Form pour les records
        const recordForm = document.getElementById('addRecordForm');
        if (recordForm) {
            recordForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const recordData = {
                    player: document.getElementById('playerName').value.trim(),
                    percentage: document.getElementById('recordPercentage').value,
                    videoLink: document.getElementById('videoLink').value.trim(),
                    device: document.getElementById('deviceType').value
                };

                this.addRecord(recordData);
                recordForm.reset();
                this.toggleRecordForm();
            });
        }

        // Form pour la musique
        const musicForm = document.getElementById('addMusicForm');
        if (musicForm) {
            musicForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const musicData = {
                    name: document.getElementById('musicName').value.trim(),
                    artist: document.getElementById('musicArtist').value.trim(),
                    link: document.getElementById('musicLink').value.trim(),
                    newgroundsId: document.getElementById('newgroundsId').value.trim()
                };

                this.updateMusic(musicData);
                this.toggleMusicForm();
            });
        }
    }

    async handleIdChange() {
        const newId = document.getElementById('newLevelId').value;
        if (!newId || newId === this.level.id.toString()) {
            alert('❌ Veuillez entrer un nouvel ID différent');
            return;
        }

        if (confirm(`Êtes-vous sûr de vouloir changer l'ID de ${this.level.id} à ${newId} ?`)) {
            await this.updateLevelId(newId);
        }
    }

    toggleRecordForm() {
        const form = document.getElementById('recordForm');
        form.classList.toggle('hidden');
    }

    toggleMusicForm() {
        const form = document.getElementById('musicForm');
        form.classList.toggle('hidden');
    }
}

let levelEditor;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('editLoginForm');
    loginForm.addEventListener('submit', handleEditLogin);

    if (sessionStorage.getItem('editAdminSession') === 'active') {
        showEditPanel();
    }
});

async function handleEditLogin(e) {
    e.preventDefault();
    const password = document.getElementById('editPassword').value;
    const errorDiv = document.getElementById('editLoginError');

    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('editAdminSession', 'active');
        document.getElementById('editPassword').value = '';
        errorDiv.classList.add('hidden');
        await showEditPanel();
    } else {
        errorDiv.textContent = '❌ Mot de passe incorrect';
        errorDiv.classList.remove('hidden');
    }
}

async function showEditPanel() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('editPanel').classList.remove('hidden');
    levelEditor = new LevelEditor();
    await levelEditor.loadLevel();
}

function logoutEdit() {
    sessionStorage.removeItem('editAdminSession');
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('editPanel').classList.add('hidden');
}
