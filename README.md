# SV Challenge List - Version HTML

Un site de liste de niveaux de défi **100% éditable** en HTML/CSS/JavaScript, basé sur ta liste SV Challenge.

## 🎯 Caractéristiques

### Pour les utilisateurs
- ✅ **Filtrage par difficulté** (Extrême, Très Difficile, Difficile, Moyen, Facile, Très Facile)
- ✅ **Filtrage par longueur** (Tiny, Short, Medium, Long, XL)
- ✅ **Recherche** en temps réel par nom ou créateur
- ✅ **Design moderne** et responsive
- ✅ **Page de détails** pour chaque niveau (ID, musique, records)
- ✅ **Soumission de niveaux** via formulaire
- ✅ **Soumission de records** avec validation par vidéo YouTube
- ✅ **Système de points** automatique basé sur le classement

### Pour les administrateurs (mot de passe: SV2026)
- 🔐 **Panel admin** pour gérer les soumissions
- 🏆 **Gestion du classement** (modifier rangs, difficultés)
- 🏅 **Gestion des records** (accepter/rejeter les soumissions)
- ✏️ **Édition des niveaux** (ID, musique, records)
- 🎵 **Ajout de musique** pour chaque niveau

## 📁 Structure

```
sv/
├── index.html                  # Page principale avec la liste
├── style.css                   # Styles principaux
├── script.js                   # Logique de la liste et filtres
├── submission.html             # Formulaire de soumission de niveaux
├── submission.js               # Gestion des soumissions
├── submission.css              # Styles des formulaires
├── level-details.html          # Page de détails d'un niveau
├── level-details.js            # Logique des détails
├── level-details.css           # Styles de la page détails
├── record-submission.js        # Gestion des soumissions de records
├── admin.html                  # Panel admin principal
├── admin.js                    # Logique admin
├── admin-ranking.html          # Gestion du classement
├── admin-ranking.js            # Logique de gestion du classement
├── admin-records.html          # Gestion des records
├── admin-records.js            # Logique de gestion des records
├── admin-edit-level.html       # Édition des niveaux
├── admin-edit-level.js         # Logique d'édition
└── README.md                   # Ce fichier
```

## 🚀 Utilisation

### Pour les visiteurs

1. **Voir la liste** : Ouvre `index.html`
2. **Soumettre un niveau** : Clique sur "📝 Soumettre un niveau"
3. **Voir les détails** : Clique sur n'importe quel niveau
4. **Soumettre un record** : Sur la page d'un niveau, clique sur "+ Soumettre un record"

### Pour les administrateurs

1. **Accéder à l'admin** : Clique sur "👨‍💼 Admin" (mot de passe: `SV2026`)
2. **Gérer les soumissions** : Accepte/rejette les niveaux soumis
3. **Gérer le classement** : Change les rangs et difficultés
4. **Gérer les records** : Accepte/rejette les records soumis
5. **Éditer un niveau** : Modifie l'ID, la musique, ajoute des records
6. **Voir les classements** : Clique sur "🏆 Classements" pour voir les meilleurs joueurs et vérificateurs

## 🏆 Système de classements

### Classement des Joueurs
- Points gagnés selon les niveaux complétés
- Plus le niveau est difficile (haut rangé), plus de points
- Les records sont triés par nombre de points totaux
- Affichage des meilleures réalisations

### Classement des Vérificateurs
- Points gagnés selon les niveaux vérifiés
- Points basés sur les niveaux qu'ils ont approuvés
- Classement par points totaux et nombre de niveaux vérifiés

## 💾 Système de stockage

Tout est sauvegardé dans **localStorage** :
- `svChallengeSubmissions` : Soumissions de niveaux
- `svChallengeRecordSubmissions` : Soumissions de records
- `level_records_{id}` : Records validés pour chaque niveau
- `level_music_{id}` : Musique pour chaque niveau

## 📊 Système de points

Les points sont calculés automatiquement selon le rang :
- **Top 1** : 150 points fixes
- **Top 2-10** : 145, 140, 135, 130, 125, 120, 115, 110, 105
- **Top 11-50** : Décroissance de 2 points par rang
- **Top 51-100** : Décroissance progressive
- **Au-delà** : 10 points

## 🎨 Personnalisation

Ouvre `script.js` et modifie le tableau `levels` :

```javascript
const levels = [
    {
        id: 1,
        rank: 1,
        name: "Ton Niveau",
        creator: "Créateur",
        difficulty: "Extreme",  // ou "Hard", "Medium"
        length: "Tiny",         // ou "Short", "Medium"
        points: 350,
        author: "Auteur du record"
    },
    // ... ajoute tes niveaux
];
```

### Personnalisation

**Couleurs** → Modifie `style.css` :
- `#667eea` → Couleur principale
- `#764ba2` → Couleur secondaire
- `#ff6b6b`, `#ffa94d`, `#74c0fc` → Couleurs difficultés

**Titre** → Modifie `<h1>` dans `index.html`

**Statistiques** → Mets à jour dans `index.html` :
```html
<span class="stat-number" id="levelCount">13</span>
<span class="stat-number" id="recordCount">42</span>
```

## 📱 Responsive

Le site s'adapte automatiquement aux téléphones, tablettes et ordinateurs.

## 💡 Conseils

- Pour ajouter 50+ niveaux, préfère une base de données
- Pour exporter en PDF/image, utilise des outils en ligne
- Pour héberger : Vercel, Netlify, GitHub Pages (gratuit)

---

**Fait avec ❤️** - Tu as maintenant la main sur le HTML ! 🎉
