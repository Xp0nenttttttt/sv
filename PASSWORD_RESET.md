# Système de Réinitialisation de Mot de Passe

## 📋 Vue d'ensemble

Un système complet de réinitialisation de mot de passe a été intégré pour **les administrateurs ET les utilisateurs normaux**.

### Pour les Administrateurs
- Réinitialisation par email (`admin.html` → "Mot de passe oublié")
- Changement depuis le panneau admin (quand connecté)

### Pour les Utilisateurs
- Réinitialisation par email (`auth.html` → "Mot de passe oublié")
- Changement depuis la page compte (`auth.html`, section "Changer mon mot de passe")

## 🔧 Configuration requise

### 1. URL de redirection dans Supabase

Vous **DEVEZ** configurer l'URL de redirection dans Supabase pour que les emails fonctionnent correctement.

1. Allez dans votre projet Supabase
2. **Authentication** → **URL Configuration**
3. Cliquez sur **Redirect URLs**
4. Ajoutez ces URLs :
   ```
   http://localhost:3000/reset-password.html
   http://localhost:5500/reset-password.html
   http://localhost:3000/user-reset-password.html
   http://localhost:5500/user-reset-password.html
   https://votre-domaine.com/reset-password.html
   https://votre-domaine.com/user-reset-password.html
   ```
   *(Adaptez selon votre environnement)*

### 2. Configuration SMTP pour les emails

Par défaut, Supabase utilise son service d'email. Vous pouvez aussi configurer SMTP personnalisé :

1. **Authentication** → **Email**
2. Laissez Supabase gérer les emails (défaut recommandé)
3. Ou configurez SMTP personnel si vous en avez un

## 🔐 Utilisation

### Pour les administrateurs

**Mot de passe oublié :**
1. Allez sur `admin.html`
2. Cliquez sur **"Mot de passe oublié ?"**
3. Entrez votre adresse email admin
4. Cliquez sur **"Envoyer un email de réinitialisation"**
5. Consultez votre email (y compris les spams !)
6. Cliquez le lien dans l'email
7. Entrez votre nouveau mot de passe
8. Cliquez sur **"Réinitialiser le mot de passe"**
9. Vous êtes redirigé et pouvez vous reconnecter

**Changer le mot de passe (une fois connecté) :**
1. Connectez-vous au panneau admin
2. Cliquez sur **"🔑 Changer mon mot de passe"** (ou allez dans "Gérer les comptes")
3. Entrez votre mot de passe actuel
4. Entrez le nouveau mot de passe
5. Confirmez
6. Votre mot de passe est mis à jour immédiatement

### Pour les utilisateurs normaux

**Mot de passe oublié :**
1. Allez sur `auth.html`
2. Cliquez sur **"Mot de passe oublié ?"**
3. Entrez votre adresse email
4. Cliquez sur **"Envoyer le lien de réinitialisation"**
5. Consultez votre email (y compris les spams !)
6. Cliquez le lien dans l'email
7. Entrez votre nouveau mot de passe
8. Confirmez
9. Vous êtes redirigé et pouvez vous connecter

**Changer le mot de passe (une fois connecté) :**
1. Allez sur `auth.html`
2. Connectez-vous
3. Dans la section **"🔑 Changer mon mot de passe"**
4. Entrez votre mot de passe actuel
5. Entrez le nouveau mot de passe
6. Confirmez
7. Votre mot de passe est mis à jour immédiatement

## 📧 Emails de réinitialisation

### Personnaliser l'email

Supabase génère automatiquement les emails, mais vous pouvez les personnaliser :

1. **Authentication** → **Email Templates**
2. Cliquez sur **Reset Password**
3. Modifiez le template HTML/texte
4. Sauvegardez

### Dépannage des emails

**Les emails ne sont pas reçus ?**

1. Vérifiez la boîte spam/indésirables
2. Vérifiez les logs Supabase : **Authentication** → **Logs**
3. Vérifiez l'URL de redirection configurée
4. Attendez 5-10 minutes (délai de propagation)

**L'email vient de "noreply@..."**

- C'est normal, c'est l'adresse par défaut de Supabase
- Vous pouvez la personnaliser dans les settings SMTP

## 🔗 URLs impliquées

### Admin page
- **URL** : `/admin.html`
- **Fonction** : Connexion et accès au formulaire "Mot de passe oublié ?"
- **Fichiers** : `admin.html`, `password-reset.js`

### Reset password page
- **URL** : `/reset-password.html`
- **Fonction** : Formulaire pour entrer le nouveau mot de passe
- **Lien reçu dans l'email** : `https://votre-site.com/reset-password.html?type=recovery&token=...`

## 🔄 Flux de réinitialisation

```
1. Admin clique "Mot de passe oublié ?"
   ↓
2. Email envoyé à admin@example.com
   ↓
3. Admin reçoit l'email avec lien magic
   ↓
4. Admin clique le lien → Redirection vers reset-password.html
   ↓
5. Admin entre nouveau mot de passe (6+ caractères)
   ↓
6. Mot de passe mis à jour dans Supabase
   ↓
7. Redirection vers admin.html pour reconnexion
```

## 🔐 Sécurité

### Tokens de réinitialisation

- **Durée de validité** : 1 heure (configurable dans Supabase)
- **Utilisation unique** : Peut être utilisé une seule fois
- **Lié à l'email** : Généré spécifiquement pour le compte

### Bonnes pratiques

- ✅ Le mot de passe doit faire au moins 6 caractères
- ✅ Les tokens expirent automatiquement
- ✅ La confirmation du mot de passe est obligatoire
- ❌ Ne partagez jamais le lien avec quelqu'un d'autre
- ❌ Ne conservez pas le lien (il n'est valable qu'une fois)

## 🛠️ Gestion des cas limites

### Token expiré

- L'utilisateur voit le message : "Lien expiré ou invalide"
- Solution : Recommencer le processus depuis le début

### Mauvais mot de passe

- L'utilisateur voir une erreur : "Les mots de passe ne correspondent pas"
- Solution : Réentrer les mots de passe

### Email déjà utilisé par un autre compte

- Supabase ne révèle pas l'info pour la sécurité
- L'email est rejeté silencieusement
- Solution : Utiliser le bon email

## 📞 Dépannage avancé

### Vérifier les configurations dans Supabase

```sql
-- Vérifier les utilisateurs et leur statut
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users;

-- Vérifier si c'est un admin
SELECT au.id, u.email
FROM public.admin_users au
JOIN auth.users u ON u.id = au.id;
```

### Réinitialiser manuellement un mot de passe (Admin Supabase)

Si l'utilisateur ne peut vraiment pas accéder :

1. Allez dans **Authentication** → **Users**
2. Trouvez l'utilisateur
3. Cliquez les 3 points → **Reset password**
4. Un email lui sera renvoyé

## 🎯 Points importants

⚠️ **IMPORTANT** : Configurez les URL de redirection dans Supabase AVANT de tester !

Sans cette configuration :
- Les emails seront envoyés
- Mais les liens ne fonctionneront pas
- L'utilisateur verra une page d'erreur

## 📝 Fichiers impliqués

### Pour les administrateurs
- `admin.html` - Formulaire de connexion + lien "Mot de passe oublié" + changement de mot de passe
- `admin-accounts.html` - Changement de mot de passe dans la gestion des comptes
- `password-reset.js` - Logique d'envoi de l'email (admins)
- `reset-password.html` - Page de réinitialisation du mot de passe (admins)
- `admin-password-change.js` - Logique de changement de mot de passe (admins connectés)

### Pour les utilisateurs normaux
- `auth.html` - Connexion + lien "Mot de passe oublié" + changement de mot de passe
- `user-reset-password.html` - Page de réinitialisation du mot de passe (utilisateurs)
- `user-password-change.js` - Logique de changement de mot de passe (utilisateurs connectés)

### Commun
- `supabase-config.js` - Configuration Supabase

## 💡 Améliorations futures possibles

- Rate limiting (limiter le nombre d'emails)
- Notifications à l'administrateur (quelqu'un a réinitialisé)
- Historique des réinitialisations
- Questions de sécurité en secours
- Code unique par SMS
