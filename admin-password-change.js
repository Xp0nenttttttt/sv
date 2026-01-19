// Gestion du changement de mot de passe pour les admins

// Afficher le modal de changement de mot de passe
function showPasswordChangeModal() {
    document.getElementById('passwordChangeModal').style.display = 'block';
    document.getElementById('passwordChangeError').classList.add('hidden');
    document.getElementById('passwordChangeSuccess').classList.add('hidden');

    // Réinitialiser le formulaire
    document.getElementById('passwordChangeForm').reset();
}

// Fermer le modal
function closePasswordChangeModal() {
    document.getElementById('passwordChangeModal').style.display = 'none';
    document.getElementById('passwordChangeForm').reset();
}

// Fermer le modal si on clique en dehors
window.onclick = function (event) {
    const modal = document.getElementById('passwordChangeModal');
    if (event.target === modal) {
        closePasswordChangeModal();
    }
}

// Gérer la soumission du formulaire
async function handlePasswordChange(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPasswordChange').value;
    const confirmPassword = document.getElementById('confirmPasswordChange').value;

    const errorMsg = document.getElementById('passwordChangeError');
    const successMsg = document.getElementById('passwordChangeSuccess');

    // Réinitialiser les messages
    errorMsg.classList.add('hidden');
    successMsg.classList.add('hidden');

    // Validations
    if (newPassword.length < 6) {
        errorMsg.textContent = '❌ Le nouveau mot de passe doit contenir au moins 6 caractères';
        errorMsg.classList.remove('hidden');
        return;
    }

    if (newPassword !== confirmPassword) {
        errorMsg.textContent = '❌ Les mots de passe ne correspondent pas';
        errorMsg.classList.remove('hidden');
        return;
    }

    if (newPassword === currentPassword) {
        errorMsg.textContent = '❌ Le nouveau mot de passe doit être différent de l\'ancien';
        errorMsg.classList.remove('hidden');
        return;
    }

    if (!window.supabaseClient) {
        errorMsg.textContent = '❌ Supabase non disponible';
        errorMsg.classList.remove('hidden');
        return;
    }

    try {
        // Vérifier d'abord le mot de passe actuel en essayant de se reconnecter
        const { data: { session } } = await window.supabaseClient.auth.getSession();

        if (!session || !session.user) {
            errorMsg.textContent = '❌ Session expirée. Veuillez vous reconnecter.';
            errorMsg.classList.remove('hidden');
            return;
        }

        const userEmail = session.user.email;

        // Vérifier le mot de passe actuel
        const { error: signInError } = await window.supabaseClient.auth.signInWithPassword({
            email: userEmail,
            password: currentPassword
        });

        if (signInError) {
            errorMsg.textContent = '❌ Mot de passe actuel incorrect';
            errorMsg.classList.remove('hidden');
            return;
        }

        // Mettre à jour le mot de passe
        const { error: updateError } = await window.supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (updateError) throw updateError;

        // Succès !
        console.log('✅ Mot de passe changé avec succès');
        successMsg.textContent = '✅ Votre mot de passe a été changé avec succès !';
        successMsg.classList.remove('hidden');

        // Réinitialiser le formulaire
        document.getElementById('passwordChangeForm').reset();

        // Fermer le modal après 2 secondes
        setTimeout(() => {
            closePasswordChangeModal();
        }, 2000);

    } catch (error) {
        console.error('Erreur changement de mot de passe:', error);
        errorMsg.textContent = '❌ ' + (error.message || 'Erreur lors du changement de mot de passe');
        errorMsg.classList.remove('hidden');
    }
}

// Ajouter l'event listener quand le DOM est prêt
document.addEventListener('DOMContentLoaded', function () {
    const passwordChangeForm = document.getElementById('passwordChangeForm');
    if (passwordChangeForm) {
        passwordChangeForm.addEventListener('submit', handlePasswordChange);
    }

    // Fermer avec la touche Échap
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            const modal = document.getElementById('passwordChangeModal');
            if (modal && modal.style.display === 'block') {
                closePasswordChangeModal();
            }
        }
    });
});
