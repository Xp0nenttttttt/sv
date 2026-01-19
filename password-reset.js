// Gestion de la réinitialisation de mot de passe

// Afficher le formulaire de réinitialisation
function showPasswordResetForm() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('passwordResetSection').classList.remove('hidden');
    document.getElementById('resetError').classList.add('hidden');
    document.getElementById('resetSuccess').classList.add('hidden');
}

// Afficher le formulaire de connexion
function showLoginForm() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('passwordResetSection').classList.add('hidden');
    document.getElementById('loginError').classList.add('hidden');
}

// Envoyer l'email de réinitialisation
async function sendPasswordReset(event) {
    event.preventDefault();

    const email = document.getElementById('resetEmail').value.trim();
    const errorMsg = document.getElementById('resetError');
    const successMsg = document.getElementById('resetSuccess');

    // Réinitialiser les messages
    errorMsg.classList.add('hidden');
    successMsg.classList.add('hidden');

    if (!email) {
        errorMsg.textContent = '❌ Veuillez entrer votre email';
        errorMsg.classList.remove('hidden');
        return;
    }

    if (!window.supabaseClient) {
        errorMsg.textContent = '❌ Supabase non disponible';
        errorMsg.classList.remove('hidden');
        return;
    }

    try {
        // Déterminer l'URL de redirection correcte
        const protocol = window.location.protocol;
        const host = window.location.host;
        const redirectUrl = `${protocol}//${host}/reset-password.html`;

        console.log('📧 Envoi de l\'email de réinitialisation à:', email);
        console.log('🔗 URL de redirection:', redirectUrl);

        // Envoyer l'email via Supabase Auth
        const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
        });

        if (error) {
            console.error('Erreur Supabase:', error);
            throw error;
        }

        // Succès
        successMsg.innerHTML = '✅ Un email de réinitialisation a été envoyé à <strong>' + escapeHtml(email) + '</strong><br><br>Vérifiez votre boîte mail (et les spams) pour le lien de réinitialisation.';
        successMsg.classList.remove('hidden');

        // Nettoyer le formulaire
        document.getElementById('resetEmail').value = '';

        // Rediriger après 3 secondes
        setTimeout(() => {
            showLoginForm();
        }, 5000);

    } catch (err) {
        console.error('Erreur lors de l\'envoi:', err);
        errorMsg.textContent = '❌ ' + (err.message || 'Erreur lors de l\'envoi de l\'email');
        errorMsg.classList.remove('hidden');
    }
}

// Ajouter l'event listener quand le DOM est prêt
document.addEventListener('DOMContentLoaded', function () {
    const passwordResetForm = document.getElementById('passwordResetForm');
    if (passwordResetForm) {
        passwordResetForm.addEventListener('submit', sendPasswordReset);
    }
});

// Fonction utilitaire pour échapper le HTML (prévenir XSS)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
