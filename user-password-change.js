// Gestion du changement de mot de passe pour les utilisateurs normaux

document.addEventListener('DOMContentLoaded', function () {
    const changePasswordBtn = document.getElementById('changePasswordBtn');

    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', handleUserPasswordChange);
    }
});

async function handleUserPasswordChange() {
    const currentPassword = document.getElementById('userCurrentPassword').value.trim();
    const newPassword = document.getElementById('userNewPassword').value.trim();
    const confirmPassword = document.getElementById('userConfirmPassword').value.trim();

    const msgElement = document.getElementById('passwordChangeMsg');

    // Réinitialiser le message
    msgElement.className = 'muted';
    msgElement.textContent = '';

    // Validations
    if (!currentPassword || !newPassword || !confirmPassword) {
        msgElement.className = 'error';
        msgElement.textContent = '❌ Tous les champs sont requis';
        return;
    }

    if (newPassword.length < 6) {
        msgElement.className = 'error';
        msgElement.textContent = '❌ Le nouveau mot de passe doit contenir au moins 6 caractères';
        return;
    }

    if (newPassword !== confirmPassword) {
        msgElement.className = 'error';
        msgElement.textContent = '❌ Les nouveaux mots de passe ne correspondent pas';
        return;
    }

    if (newPassword === currentPassword) {
        msgElement.className = 'error';
        msgElement.textContent = '❌ Le nouveau mot de passe doit être différent de l\'ancien';
        return;
    }

    // Vérifier que Supabase est disponible
    if (!window.supabaseClient) {
        msgElement.className = 'error';
        msgElement.textContent = '❌ Service non disponible. Rechargez la page.';
        return;
    }

    try {
        // Vérifier qu'il y a une session active
        const { data: { session } } = await window.supabaseClient.auth.getSession();

        if (!session || !session.user) {
            msgElement.className = 'error';
            msgElement.textContent = '❌ Vous devez être connecté pour changer votre mot de passe';
            return;
        }

        const userEmail = session.user.email;

        msgElement.className = 'muted';
        msgElement.textContent = '⏳ Vérification du mot de passe actuel...';

        // Vérifier le mot de passe actuel en essayant de se reconnecter
        const { error: signInError } = await window.supabaseClient.auth.signInWithPassword({
            email: userEmail,
            password: currentPassword
        });

        if (signInError) {
            msgElement.className = 'error';
            msgElement.textContent = '❌ Mot de passe actuel incorrect';
            return;
        }

        msgElement.textContent = '⏳ Mise à jour du mot de passe...';

        // Mettre à jour le mot de passe
        const { error: updateError } = await window.supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (updateError) {
            throw updateError;
        }

        // Succès !
        msgElement.className = 'success';
        msgElement.textContent = '✅ Votre mot de passe a été changé avec succès !';

        // Réinitialiser les champs
        document.getElementById('userCurrentPassword').value = '';
        document.getElementById('userNewPassword').value = '';
        document.getElementById('userConfirmPassword').value = '';

        console.log('✅ Mot de passe utilisateur changé');

    } catch (error) {
        console.error('Erreur changement de mot de passe:', error);
        msgElement.className = 'error';
        msgElement.textContent = '❌ ' + (error.message || 'Erreur lors du changement de mot de passe');
    }
}
