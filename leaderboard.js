// Leaderboard Page Logic

// Ne pas charger automatiquement - sera appelé après activation Supabase
// document.addEventListener('DOMContentLoaded', () => {
//     loadLeaderboards();
//     setupFilters();
// });

// Charger les filtres dès que le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    setupFilters();
});

function setupFilters() {
    const countryFilter = document.getElementById('countryFilter');
    const regionFilter = document.getElementById('regionFilter');
    const resetButton = document.getElementById('resetFilters');

    countryFilter.addEventListener('change', applyFilters);
    regionFilter.addEventListener('input', applyFilters);
    resetButton.addEventListener('click', () => {
        countryFilter.value = '';
        regionFilter.value = '';
        renderCombinedLeaderboard();
    });
}

function applyFilters() {
    renderCombinedLeaderboard();
}

function loadLeaderboards() {
    // Charger les stats globales
    const stats = leaderboardManager.getGlobalStats();
    document.getElementById('statsLevels').textContent = stats.totalLevels;
    document.getElementById('statsRecords').textContent = stats.totalRecords;
    document.getElementById('statsPlayers').textContent = stats.totalPlayers;

    // Charger le classement global
    renderCombinedLeaderboard();
}

function renderCombinedLeaderboard() {
    let combined = leaderboardManager.getCombinedLeaderboard();

    // Appliquer les filtres
    const countryFilter = document.getElementById('countryFilter').value;
    const regionFilter = document.getElementById('regionFilter').value.toLowerCase();

    if (countryFilter || regionFilter) {
        combined = combined.filter(entry => {
            const matchCountry = !countryFilter || entry.country === countryFilter;
            const matchRegion = !regionFilter || (entry.region && entry.region.toLowerCase().includes(regionFilter));
            return matchCountry && matchRegion;
        });
    }

    const container = document.getElementById('combinedLeaderboard');

    if (combined.length === 0) {
        container.innerHTML = '<p class="no-data">Aucune donnée disponible</p>';
        return;
    }

    container.innerHTML = combined.map((entry, index) => {
        if (entry.type === 'player') {
            return `
                <div class="leaderboard-item">
                    <div class="rank-badge rank-${getMedalClass(index)}">
                        ${getMedalIcon(index)} #${index + 1}
                    </div>
                    <div class="player-info">
                        <div class="player-name">🎮 ${escapeHtml(entry.name)}</div>
                        ${entry.country ? `<div class="player-location">📍 ${escapeHtml(entry.country)}${entry.region ? ` - ${escapeHtml(entry.region)}` : ''}</div>` : ''}
                        <div class="player-stats">
                            <span class="stat-badge">📊 ${entry.recordsCount} record${entry.recordsCount > 1 ? 's' : ''}</span>
                            <span class="stat-badge">📈 ${entry.maxPercentage}% max</span>
                        </div>
                        <div class="player-records">
                            ${(entry.records && entry.records.length > 0) ? entry.records.slice(0, 3).map(record => `
                                <div class="mini-record">
                                    <a href="level-details.html?id=${record.levelId}" class="record-level-link">
                                        ✓ ${escapeHtml(record.levelName)}
                                    </a>
                                    <span class="record-points">+${record.points}pts</span>
                                </div>
                            `).join('') : '<p class="no-records">Aucun record pour le moment</p>'}
                            ${entry.records && entry.records.length > 3 ? `<div class="more-records">+${entry.records.length - 3} autre${entry.records.length - 3 > 1 ? 's' : ''}</div>` : ''}
                        </div>
                    </div>
                    <div class="player-points">
                        <div class="points-number">${entry.totalPoints}</div>
                        <div class="points-label">points</div>
                    </div>
                </div>
            `;
        } else if (entry.type === 'verifier') {
            return `
                <div class="leaderboard-item">
                    <div class="rank-badge rank-${getMedalClass(index)}">
                        ${getMedalIcon(index)} #${index + 1}
                    </div>
                    <div class="verifier-info">
                        <div class="verifier-name">👤 ${escapeHtml(entry.name)}</div>
                        ${entry.country ? `<div class="player-location">📍 ${escapeHtml(entry.country)}${entry.region ? ` - ${escapeHtml(entry.region)}` : ''}</div>` : ''}
                        <div class="verifier-stats">
                            <span class="stat-badge">🏆 ${entry.levelsVerified} niveau${entry.levelsVerified > 1 ? 'x' : ''} vérifié${entry.levelsVerified > 1 ? 's' : ''}</span>
                        </div>
                        <div class="verifier-levels">
                            ${entry.levels.slice(0, 3).map(level => `
                                <div class="mini-level">
                                    <a href="level-details.html?id=${level.levelId}" class="level-link">
                                        ★ ${escapeHtml(level.levelName)}
                                    </a>
                                    <span class="level-points">+${level.points}pts</span>
                                </div>
                            `).join('')}
                            ${entry.levels.length > 3 ? `<div class="more-levels">+${entry.levels.length - 3} autre${entry.levels.length - 3 > 1 ? 's' : ''}</div>` : ''}
                        </div>
                    </div>
                    <div class="verifier-points">
                        <div class="points-number">${entry.totalPoints}</div>
                        <div class="points-label">points</div>
                    </div>
                </div>
            `;
        } else if (entry.type === 'both') {
            return `
                <div class="leaderboard-item">
                    <div class="rank-badge rank-${getMedalClass(index)}">
                        ${getMedalIcon(index)} #${index + 1}
                    </div>
                    <div class="both-info">
                        <div class="both-name">👥 ${escapeHtml(entry.name)} <span class="badge-both">(Joueur & Vérif)</span></div>
                        ${entry.country ? `<div class="player-location">📍 ${escapeHtml(entry.country)}${entry.region ? ` - ${escapeHtml(entry.region)}` : ''}</div>` : ''}
                        <div class="both-stats">
                            <span class="stat-badge">📊 ${entry.recordsCount} record${entry.recordsCount > 1 ? 's' : ''}</span>
                            <span class="stat-badge">🏆 ${entry.levelsVerified} niveau${entry.levelsVerified > 1 ? 'x' : ''} vérifié${entry.levelsVerified > 1 ? 's' : ''}</span>
                        </div>
                        <div class="both-achievements">
                            ${(entry.records && entry.records.length > 0) ? `
                                <div class="achievements-section">
                                    <strong>🎮 Records:</strong>
                                    ${entry.records.slice(0, 2).map(record => `
                                        <div class="mini-record">
                                            <a href="level-details.html?id=${record.levelId}" class="record-level-link">
                                                ✓ ${escapeHtml(record.levelName)}
                                            </a>
                                            <span class="record-points">+${record.points}pts</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            ${(entry.levels && entry.levels.length > 0) ? `
                                <div class="achievements-section">
                                    <strong>⭐ Niveaux vérifiés:</strong>
                                    ${entry.levels.slice(0, 2).map(level => `
                                        <div class="mini-level">
                                            <a href="level-details.html?id=${level.levelId}" class="level-link">
                                                ★ ${escapeHtml(level.levelName)}
                                            </a>
                                            <span class="level-points">+${level.points}pts</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="both-points">
                        <div class="points-number">${entry.totalPoints}</div>
                        <div class="points-label">points</div>
                    </div>
                </div>
            `;
        }
    }).join('');
}

function getMedalIcon(index) {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return '';
}

function getMedalClass(index) {
    if (index === 0) return 'gold';
    if (index === 1) return 'silver';
    if (index === 2) return 'bronze';
    return 'default';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
