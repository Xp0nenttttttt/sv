// Gestion de la page de détails du niveau
class LevelDetailsManager {
    constructor() {
        this.level = null;
        this.records = [];
        this.music = null;
        // Appeler async sans await (lance la chaîne async)
        this.loadLevelData().catch(err => {
            console.error('Erreur chargement niveau:', err);
        });
    }

    // Récupérer l'ID du niveau depuis l'URL
    getLevelIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const raw = urlParams.get('id');
        return raw ? String(raw) : '';
    }

    // Charger les données du niveau
    async loadLevelData() {
        const levelId = this.getLevelIdFromUrl();
        console.log(`🔍 Chargement niveau ID: ${levelId}`);

        if (!levelId) {
            this.showError('Aucun niveau spécifié');
            return;
        }

        // Charger tous les niveaux (base + soumissions)
        const allLevels = await this.getAllLevels();
        console.log(`📋 Total niveaux chargés: ${allLevels.length}`, allLevels);

        this.level = allLevels.find(l => l.id === levelId);
        console.log(`🎮 Niveau trouvé:`, this.level);

        if (!this.level) {
            this.showError('Niveau introuvable');
            return;
        }

        // Charger les records pour ce niveau
        await this.loadRecords();

        // Charger la musique
        await this.loadMusic();

        // Afficher les détails
        this.renderLevelDetails();
    }

    // Charger la musique depuis localStorage
    async loadMusic() {
        const storageKey = `level_music_${this.level.id}`;
        try {
            const data = await universalStorage.getData(storageKey);
            this.music = data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;
            console.log(`🎵 Musique chargée: ${this.music ? this.music.name : 'aucune'}`);
        } catch (err) {
            console.warn('⚠️ Erreur chargement musique:', err.message);
            this.music = null;
        }
    }

    // Fonction pour calculer les points selon le rang
    calculatePoints(rank) {
        if (rank === 1) return 150; // Top 1 = 150 points fixes
        if (rank <= 10) return 150 - (rank - 1) * 5; // Top 2-10: 145, 140, 135...
        if (rank <= 50) return 100 - (rank - 10) * 2; // Top 11-50
        if (rank <= 100) return 20 - Math.floor((rank - 50) / 10); // Top 51-100
        return 10; // Au-delà du top 100
    }

    // Charger les niveaux depuis Supabase (source officielle)
    async fetchLevelsFromSupabase() {
        if (typeof SUPABASE_CONFIG === 'undefined' || !SUPABASE_CONFIG.URL || !SUPABASE_CONFIG.KEY) {
            return [];
        }

        const endpoint = `${SUPABASE_CONFIG.URL}/rest/v1/levels` +
            '?select=id,level_name,creator_name,approved_rank,approved_difficulty,length,tags,status,image_url,image_base64,imageUrl,imageBase64,proposed_top,badge,description,submitted_at,accepted_at,author_name';

        try {
            const res = await fetch(endpoint, {
                headers: {
                    apikey: SUPABASE_CONFIG.KEY,
                    Authorization: `Bearer ${SUPABASE_CONFIG.KEY}`
                }
            });

            if (!res.ok) {
                console.warn('⚠️ Supabase levels fetch failed (details):', res.status, await res.text());
                return [];
            }

            const rows = await res.json();
            const acceptedRows = Array.isArray(rows) ? rows.filter(r => r.status === 'accepted') : [];
            return acceptedRows.map(r => this.mapSupabaseRowToLevel(r)).sort((a, b) => a.rank - b.rank);
        } catch (err) {
            console.warn('⚠️ Supabase levels fetch error (details):', err.message);
            return [];
        }
    }

    // Mapper une ligne Supabase vers le format attendu
    mapSupabaseRowToLevel(row) {
        const rank = row.approved_rank ?? 999;
        return {
            id: String(row.id),
            rank: rank,
            name: row.level_name || 'Niveau',
            creator: row.creator_name || 'Inconnu',
            difficulty: this.normalizeDifficulty(row.approved_difficulty),
            length: row.length || 'Short',
            points: this.calculatePoints(rank),
            author: row.author_name || row.creator_name || '',
            image: row.image_url || row.imageUrl || row.image_base64 || row.imageBase64,
            description: row.description || '',
            proposedTop: row.proposed_top || row.proposedTop,
            submittedAt: row.submitted_at || row.submittedAt,
            acceptedAt: row.accepted_at || row.acceptedAt,
            tags: row.tags || [],
            badge: row.badge || null
        };
    }

    // Récupérer tous les niveaux
    async getAllLevels() {
        // 0) Supabase direct
        const supabaseLevels = await this.fetchLevelsFromSupabase();
        if (supabaseLevels.length > 0) {
            return supabaseLevels;
        }

        let allSubmissions = [];

        // D'abord essayer Supabase/universalStorage
        if (typeof universalStorage !== 'undefined' && universalStorage) {
            try {
                allSubmissions = await universalStorage.getData('svChallengeSubmissions') || [];
            } catch (err) {
                console.warn('⚠️ Erreur universalStorage:', err.message);
            }
        }

        // Fallback: SubmissionManager
        if (!allSubmissions || allSubmissions.length === 0) {
            const manager = new SubmissionManager();
            allSubmissions = await manager.getSubmissions() || [];
        }

        // S'assurer que c'est un array
        if (!Array.isArray(allSubmissions)) {
            console.warn('⚠️ allSubmissions n\'est pas un array:', allSubmissions);
            allSubmissions = [];
        }

        const acceptedSubmissions = allSubmissions
            .filter(s => s.status === 'accepted')
            .map(s => {
                const rank = s.approvedRank || 999;
                return {
                    id: String(s.id),
                    rank: rank,
                    name: s.levelName,
                    creator: s.creatorName,
                    difficulty: this.normalizeDifficulty(s.approvedDifficulty),
                    length: s.length,
                    points: this.calculatePoints(rank),
                    author: s.authorName,
                    image: s.imageBase64,
                    description: s.description || '',
                    proposedTop: s.proposedTop,
                    submittedAt: s.submittedAt,
                    acceptedAt: s.acceptedAt,
                    tags: s.tags || [],
                    badge: s.badge || null
                };
            });

        return acceptedSubmissions.sort((a, b) => a.rank - b.rank);
    }

    // Charger les records depuis localStorage
    async loadRecords() {
        // Charger les records acceptés depuis Supabase
        let allRecords = [];

        // D'abord essayer universalStorage (Supabase)
        if (typeof universalStorage !== 'undefined' && universalStorage) {
            try {
                allRecords = await universalStorage.getData('svChallengeRecordSubmissions') || [];
                console.log(`📊 Records depuis universalStorage: ${allRecords.length}`, allRecords);
            } catch (err) {
                console.warn('⚠️ Erreur universalStorage records:', err.message);
            }
        }

        // Fallback: RecordSubmissionManager
        if (!allRecords || allRecords.length === 0) {
            const manager = new RecordSubmissionManager();
            allRecords = await manager.getSubmissions() || [];
            console.log(`📊 Records depuis RecordSubmissionManager: ${allRecords.length}`, allRecords);
        }

        // DEBUG: afficher le niveau en cours
        console.log(`🎮 Niveau en cours: ID=${this.level.id}`, this.level);

        // Filtrer les records acceptés pour ce niveau
        const filtered = (allRecords || []).filter(r => {
            const match = r.status === 'accepted' && String(r.levelId) === String(this.level.id);
            console.log(`  Record: ID=${r.id}, levelId=${r.levelId}, status=${r.status}, match=${match}`);
            return match;
        });

        this.records = filtered.sort((a, b) => b.percentage - a.percentage);
        console.log(`✅ Records chargés pour niveau ${this.level.id}: ${this.records.length}`, this.records);
    }

    // Ajouter un record
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

    // Supprimer un record
    deleteRecord(recordId) {
        this.records = this.records.filter(r => r.id !== recordId);
        this.saveRecords();
        this.renderRecords();
    }

    // Afficher une erreur
    showError(message) {
        const container = document.getElementById('levelDetails');
        container.innerHTML = `
            <div class="error-message">
                <h2>❌ Erreur</h2>
                <p>${message}</p>
                <a href="index.html" class="btn-primary">Retour à la liste</a>
            </div>
        `;
    }

    // Normalise une difficulté vers un libellé canonique
    normalizeDifficulty(rawDifficulty) {
        const normalized = (rawDifficulty || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        if (normalized.includes('extreme')) return 'Extreme Demon';
        if (normalized.includes('tres difficile') || normalized.includes('très difficile') || normalized.includes('insane')) return 'Insane Demon';
        if (normalized.includes('difficile') || normalized.includes('hard')) return 'Hard Demon';
        if (normalized.includes('moyen') || normalized.includes('medium')) return 'Medium Demon';
        return 'Easy Demon';
    }

    // Retourne l'icône de difficulté (fallback sur easy)
    getDifficultyIcon(difficulty) {
        const normalized = (difficulty || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        const key = normalized.includes('extreme') ? 'extreme'
            : normalized.includes('tres difficile') || normalized.includes('très difficile') || normalized.includes('insane') ? 'insane'
                : normalized.includes('difficile') || normalized.includes('hard') ? 'hard'
                    : normalized.includes('moyen') || normalized.includes('medium') ? 'medium'
                        : 'easy';

        const file = {
            extreme: 'extreme.webp',
            insane: 'insane.webp',
            hard: 'hard.webp',
            medium: 'medium.webp',
            easy: 'easy.webp'
        }[key] || 'easy.webp';

        return {
            src: `image/${file}`,
            alt: `${difficulty || key} Demon`
        };
    }

    // Afficher les détails du niveau
    renderLevelDetails() {
        const container = document.getElementById('levelDetails');
        const difficultyIcon = this.getDifficultyIcon(this.level.difficulty);

        container.innerHTML = `
            <div class="level-header">
                <div class="level-header-content">
                    <div class="level-rank-large">#${this.level.rank}</div>
                    <div class="level-title-section">
                        <h1>${this.level.name}</h1>
                        <div class="level-meta-large">
                            <img src="${difficultyIcon.src}" alt="${difficultyIcon.alt}" class="difficulty-icon difficulty-icon-large">
                            <span class="length-badge">${this.level.length}</span>
                            <span class="points-badge">${this.level.points} pts</span>
                        </div>
                        ${this.level.tags && this.level.tags.length > 0 ? `
                            <div class="tags-display">
                                ${this.level.tags.map(tag => `<span class="tag-badge ${tag}">${this.getTagEmoji(tag)} ${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
                ${this.level.image ? `
                    <div class="level-header-image">
                        <img src="${this.level.image}" alt="${this.level.name}">
                    </div>
                ` : ''}
            </div>

            <div class="level-info-grid">
                <div class="info-card">
                    <div class="info-label">🎮 ID du niveau</div>
                    <div class="info-value">${this.level.id}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">👤 Créateur</div>
                    <div class="info-value">${this.level.creator}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">🏆 Vérificateur</div>
                    <div class="info-value">${this.level.author}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">📊 Top proposé</div>
                    <div class="info-value">#${this.level.proposedTop || 'N/A'}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">📅 Soumis le</div>
                    <div class="info-value">${this.level.submittedAt ? new Date(this.level.submittedAt).toLocaleDateString('fr-FR') : 'N/A'}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">✅ Accepté le</div>
                    <div class="info-value">${this.level.acceptedAt ? new Date(this.level.acceptedAt).toLocaleDateString('fr-FR') : 'N/A'}</div>
                </div>
            </div>

            ${this.level.description ? `
                <div class="description-section">
                    <h2>📝 Description</h2>
                    <p>${this.level.description}</p>
                </div>
            ` : ''}

            <div class="music-section">
                <h2>🎵 Musique du niveau</h2>
                ${this.music ? `
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
                    </div>
                ` : `
                    <div class="music-placeholder">
                        <p>🎼 Musique : Non spécifiée</p>
                        <p class="music-info">La musique peut être ajoutée par un administrateur</p>
                    </div>
                `}
            </div>

            <div class="records-section">
                <div class="records-header">
                    <h2>🏅 Records (${this.records.length})</h2>
                    <button class="btn-primary" onclick="levelDetailsManager.toggleRecordForm()">+ Soumettre un record</button>
                </div>

                <div id="recordForm" class="record-form hidden">
                    <h3>Soumettre un nouveau record</h3>
                    <p class="form-info">Votre soumission sera vérifiée par un administrateur avant d'être ajoutée.</p>
                    <form id="addRecordForm">
                        <div class="form-group">
                            <label for="playerName">Joueur *</label>
                            <input type="text" id="playerName" placeholder="Nom du joueur" required>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="playerCountryRecord">Pays *</label>
                                <select id="playerCountryRecord" required>
                                    <option value="">Sélectionner...</option>
                                    <option value="France">🇫🇷 France</option>
                                    <option value="Belgique">🇧🇪 Belgique</option>
                                    <option value="Suisse">🇨🇭 Suisse</option>
                                    <option value="Canada">🇨🇦 Canada</option>
                                    <option value="Luxembourg">🇱🇺 Luxembourg</option>
                                    <option value="Autre">🌍 Autre</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="playerRegionRecord">Région</label>
                                <input type="text" id="playerRegionRecord" placeholder="Ex: Île-de-France, Québec...">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="recordPercentage">Pourcentage *</label>
                            <input type="number" id="recordPercentage" min="1" max="100" placeholder="100" required>
                        </div>
                        <div class="form-group">
                            <label for="videoLink">Lien vidéo (YouTube) *</label>
                            <input type="url" id="videoLink" placeholder="https://youtube.com/watch?v=..." required>
                        </div>
                        <div class="form-group">
                            <label for="deviceType">Plateforme</label>
                            <select id="deviceType">
                                <option value="PC">PC</option>
                                <option value="Mobile">Mobile</option>
                                <option value="Console">Console</option>
                            </select>
                        </div>
                        <div id="recordSuccessMsg" class="success-message hidden"></div>
                        <div id="recordErrorMsg" class="error-message-form hidden"></div>
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">📤 Soumettre</button>
                            <button type="button" class="btn-secondary" onclick="levelDetailsManager.toggleRecordForm()">Annuler</button>
                        </div>
                    </form>
                </div>

                <div id="recordsList" class="records-list"></div>
            </div>
        `;

        this.renderRecords();
        this.setupRecordForm();
    }

    // Afficher les records
    renderRecords() {
        const container = document.getElementById('recordsList');

        if (this.records.length === 0) {
            container.innerHTML = `
                <div class="no-records">
                    <p>Aucun record enregistré pour ce niveau</p>
                    <p class="hint">Soyez le premier à ajouter votre record !</p>
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
                            🎥 Voir la vidéo
                        </a>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    // Gérer le formulaire d'ajout de record
    setupRecordForm() {
        const form = document.getElementById('addRecordForm');
        const successMsg = document.getElementById('recordSuccessMsg');
        const errorMsg = document.getElementById('recordErrorMsg');

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const recordData = {
                player: document.getElementById('playerName').value.trim(),
                playerCountry: document.getElementById('playerCountryRecord').value,
                playerRegion: document.getElementById('playerRegionRecord').value.trim(),
                percentage: document.getElementById('recordPercentage').value,
                videoLink: document.getElementById('videoLink').value.trim(),
                device: document.getElementById('deviceType').value
            };

            // Validation
            if (!recordData.player || !recordData.percentage || !recordData.videoLink) {
                errorMsg.textContent = '❌ Veuillez remplir tous les champs obligatoires';
                errorMsg.classList.remove('hidden');
                successMsg.classList.add('hidden');
                return;
            }

            // Vérifier que c'est un lien YouTube
            if (!recordData.videoLink.includes('youtube.com') && !recordData.videoLink.includes('youtu.be')) {
                errorMsg.textContent = '❌ Veuillez fournir un lien YouTube valide';
                errorMsg.classList.remove('hidden');
                successMsg.classList.add('hidden');
                return;
            }

            // Soumettre le record
            if (typeof recordSubmissionManager !== 'undefined') {
                recordSubmissionManager.submitRecord(this.level.id, recordData);

                successMsg.textContent = '✅ Record soumis avec succès ! Il sera vérifié par un administrateur.';
                successMsg.classList.remove('hidden');
                errorMsg.classList.add('hidden');

                form.reset();

                setTimeout(() => {
                    successMsg.classList.add('hidden');
                    this.toggleRecordForm();
                }, 3000);
            } else {
                errorMsg.textContent = '❌ Erreur lors de la soumission';
                errorMsg.classList.remove('hidden');
                successMsg.classList.add('hidden');
            }
        });
    }

    // Afficher/masquer le formulaire de record
    toggleRecordForm() {
        const form = document.getElementById('recordForm');
        const successMsg = document.getElementById('recordSuccessMsg');
        const errorMsg = document.getElementById('recordErrorMsg');

        form.classList.toggle('hidden');

        if (form.classList.contains('hidden')) {
            successMsg.classList.add('hidden');
            errorMsg.classList.add('hidden');
        }
    }

    // Obtenir l'emoji du tag
    getTagEmoji(tag) {
        const emojis = {
            wave: '🌊',
            ship: '🚀',
            overall: '🏄',
            timing: '⏱️',
            vitesse: '⚡'
        };
        return emojis[tag] || '🏷️';
    }
}

// Initialiser la page
let levelDetailsManager;
document.addEventListener('DOMContentLoaded', () => {
    levelDetailsManager = new LevelDetailsManager();
});
