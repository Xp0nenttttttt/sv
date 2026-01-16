// Mode sombre - Gestion du toggle et persistance

function initDarkMode() {
    // Récupérer la préférence sauvegardée ou utiliser la préférence système
    const savedMode = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedMode === 'enabled' || (savedMode === null && prefersDark)) {
        enableDarkMode();
    }

    // Créer le bouton toggle
    createDarkModeToggle();
}

function createDarkModeToggle() {
    // Vérifier si le toggle existe déjà
    if (document.getElementById('darkModeToggle')) {
        return;
    }

    const toggle = document.createElement('button');
    toggle.id = 'darkModeToggle';
    toggle.className = 'dark-mode-toggle';
    toggle.setAttribute('aria-label', 'Basculer le mode sombre');
    updateToggleIcon(toggle);

    toggle.addEventListener('click', (e) => {
        e.preventDefault();
        toggleDarkMode(toggle);
    });

    document.body.appendChild(toggle);
}

function updateToggleIcon(toggle) {
    if (document.body.classList.contains('dark-mode')) {
        toggle.textContent = '☀️';
        toggle.title = 'Mode clair';
    } else {
        toggle.textContent = '🌙';
        toggle.title = 'Mode sombre';
    }
}

function enableDarkMode() {
    document.body.classList.add('dark-mode');
    localStorage.setItem('darkMode', 'enabled');

    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
        updateToggleIcon(toggle);
    }
}

function disableDarkMode() {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', 'disabled');

    const toggle = document.getElementById('darkModeToggle');
    if (toggle) {
        updateToggleIcon(toggle);
    }
}

function toggleDarkMode(toggle) {
    if (document.body.classList.contains('dark-mode')) {
        disableDarkMode();
    } else {
        enableDarkMode();
    }
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', initDarkMode);

// Réinitialiser si le toggle est supprimé par accident
window.addEventListener('load', () => {
    if (!document.getElementById('darkModeToggle')) {
        createDarkModeToggle();
    }
});
