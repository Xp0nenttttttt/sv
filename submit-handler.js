// Gestion de la soumission du formulaire avec tags
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('submissionForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
});

async function handleSubmit(event) {
    event.preventDefault();

    // Vérifier que l'utilisateur est connecté
    if (!window.submissionClient) {
        alert('Client Supabase non initialisé');
        return;
    }

    const { data: { session } } = await window.submissionClient.auth.getSession();

    if (!session) {
        alert('Vous devez être connecté pour soumettre un niveau.');
        window.location.href = 'auth.html';
        return;
    }

    const formData = new FormData(document.getElementById('submissionForm'));

    // Récupérer les tags sélectionnés
    const tags = [];
    document.querySelectorAll('input[name="tags"]:checked').forEach(checkbox => {
        tags.push(checkbox.value);
    });

    // Valider le lien YouTube
    const youtubeLink = formData.get('youtubeLink');
    if (!youtubeLink || !isValidYoutubeUrl(youtubeLink)) {
        alert('Veuillez entrer un lien YouTube valide');
        return;
    }

    // Créer l'objet de données
    const submissionData = {
        levelId: formData.get('levelId'),
        levelName: formData.get('levelName'),
        creatorName: formData.get('creatorName'),
        authorName: formData.get('authorName'),
        playerCountry: formData.get('playerCountry'),
        playerRegion: formData.get('playerRegion') || '',
        length: formData.get('length'),
        proposedTop: parseInt(formData.get('proposedTop')),
        youtubeLink: youtubeLink,
        description: formData.get('description'),
        tags: tags,
        submittedBy: session.user.id,
        submitterEmail: session.user.email
    };

    // Gérer l'image
    const imageFile = formData.get('levelImage');
    if (imageFile && imageFile.size > 0) {
        const reader = new FileReader();
        reader.onload = (e) => {
            submissionData.imageBase64 = e.target.result;
            submitLevel(submissionData);
        };
        reader.readAsDataURL(imageFile);
    } else {
        alert('Veuillez sélectionner une image');
    }
}

// Valider l'URL YouTube
function isValidYoutubeUrl(url) {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
}

function submitLevel(data) {
    try {
        const submissionManager = new SubmissionManager();
        const result = submissionManager.addSubmission(data);

        // Afficher le message de succès
        document.getElementById('submissionForm').style.display = 'none';
        document.getElementById('successMessage').classList.remove('hidden');

        // Réinitialiser après 2 secondes
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    } catch (error) {
        document.getElementById('errorMessage').textContent = 'Erreur : ' + error.message;
        document.getElementById('errorMessage').classList.remove('hidden');
    }
}
