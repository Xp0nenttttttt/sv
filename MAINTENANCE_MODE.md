# Mode Maintenance - Guide d'utilisation

## 📋 Vue d'ensemble

Le système de mode maintenance permet aux administrateurs de mettre le site hors ligne temporairement tout en gardant l'accès pour eux-mêmes. Pendant la maintenance, seuls les administrateurs connectés peuvent accéder au site.

## 🔧 Installation

### 1. Créer la table dans Supabase

Exécutez le script SQL suivant dans votre tableau de bord Supabase (SQL Editor) :

```sql
-- Voir le fichier maintenance-mode.sql
```

Le script crée :
- Une table `site_settings` pour stocker les paramètres globaux
- Les policies nécessaires pour Row Level Security
- Une valeur par défaut avec le mode maintenance désactivé

### 2. Fichiers ajoutés

- `maintenance-mode.js` - Script de gestion du mode maintenance
- `maintenance-mode.css` - Styles pour l'interface admin
- `maintenance-mode.sql` - Script SQL pour Supabase

### 3. Fichiers modifiés

Les fichiers suivants ont été mis à jour pour vérifier le mode maintenance :
- `index.html`
- `leaderboard.html`
- `level-details.html`
- `submission.html`
- `clans.html`
- `clan.html`
- `badges.html`
- `clans-ranking.html`
- `admin.html` (interface de gestion)

## 🎯 Utilisation

### Activer le mode maintenance

1. Connectez-vous au panneau admin (`admin.html`)
2. Cliquez sur le bouton **🔧 Mode Maintenance**
3. Modifiez le message si nécessaire
4. Cliquez sur **🔒 Activer Maintenance**
5. Confirmez l'activation

Une fois activé :
- Les visiteurs non-admin verront la page de maintenance
- Les administrateurs connectés peuvent naviguer normalement
- Le message personnalisé sera affiché aux visiteurs

### Désactiver le mode maintenance

1. Dans le panneau admin, section Mode Maintenance
2. Cliquez sur **🔓 Désactiver Maintenance**
3. Confirmez la désactivation
4. Le site redevient accessible à tous

### Personnaliser le message

Le message de maintenance peut être personnalisé dans le champ texte. Il sera affiché aux visiteurs pendant la maintenance.

Exemple de messages :
- "Le site est actuellement en maintenance. Nous serons de retour bientôt!"
- "Maintenance programmée en cours. Retour prévu dans 2 heures."
- "Nous améliorons votre expérience! Merci de votre patience."

## 🔐 Sécurité

- Seuls les administrateurs authentifiés (avec token de session valide) peuvent accéder au site en mode maintenance
- Les pages admin ne sont jamais bloquées par le mode maintenance
- La vérification se fait au chargement de chaque page

## 🎨 Interface

La page de maintenance affiche :
- Une icône animée (engrenage rotatif)
- Le titre "Site en Maintenance"
- Le message personnalisé
- Un lien vers la page admin pour connexion

## 💡 Notes techniques

### Comment ça fonctionne

1. Un script `maintenance-mode.js` est chargé sur toutes les pages publiques
2. Au chargement, il vérifie l'état dans Supabase (table `site_settings`)
3. Si la maintenance est active ET que l'utilisateur n'est pas admin :
   - Le contenu de la page est remplacé par la page de maintenance
4. Les admins sont identifiés par leur token de session (`adminToken`)

### Structure de données

```javascript
{
  "setting_key": "maintenance_mode",
  "setting_value": {
    "enabled": true/false,
    "message": "Votre message personnalisé"
  }
}
```

## 🐛 Dépannage

### Le mode maintenance ne s'active pas

- Vérifiez que le script SQL a bien été exécuté dans Supabase
- Vérifiez la connexion à Supabase (console du navigateur)
- Vérifiez les policies de la table `site_settings`

### Les admins sont bloqués

- Vérifiez que vous êtes bien connecté au panneau admin
- Le token de session doit être présent : `sessionStorage.getItem('adminToken')`
- Reconnectez-vous via `admin.html`

### Le message ne s'affiche pas

- Vérifiez que le message a bien été sauvegardé dans Supabase
- Rechargez la page
- Vérifiez la console du navigateur pour les erreurs

## 📝 Améliorations futures possibles

- Planification automatique de la maintenance
- Notification par email aux utilisateurs
- Compte à rebours avant activation
- Historique des maintenances
- Maintenance partielle (certaines pages seulement)
