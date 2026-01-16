// Gestion de la soumission du formulaire avec tags
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('submissionForm');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
});

function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(document.getElementById('submissionForm'));

    // Récupérer les tags sélectionnés
    const tags = [];
    document.querySelectorAll('input[name="tags"]:checked').forEach(checkbox => {
        tags.push(checkbox.value);
    });

    // Créer l'objet de données
    const submissionData = {
        levelName: formData.get('levelName'),
        creatorName: formData.get('creatorName'),
        authorName: formData.get('authorName'),
        playerCountry: formData.get('playerCountry'),
        playerRegion: formData.get('playerRegion') || '',
        length: formData.get('length'),
        proposedTop: parseInt(formData.get('proposedTop')),
        description: formData.get('description'),
        tags: tags
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
