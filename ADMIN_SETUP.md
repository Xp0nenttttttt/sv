# Configuration des Comptes Administrateurs

## 📋 Vue d'ensemble

Le système admin utilise maintenant l'authentification Supabase avec la table `admin_users` au lieu d'un mot de passe simple. Cela offre une meilleure sécurité et permet de gérer plusieurs administrateurs.

## 🔧 Prérequis

La table `admin_users` doit exister dans votre base Supabase. Elle est normalement créée via le fichier `profiles-schema.sql`.

Structure de la table :
```sql
create table if not exists public.admin_users (
  id uuid primary key references auth.users on delete cascade,
  created_at timestamp with time zone default now()
);
```

## 👤 Créer un compte administrateur

### Étape 1 : Créer un utilisateur dans Supabase Auth

1. Allez dans votre projet Supabase
2. Cliquez sur **Authentication** → **Users**
3. Cliquez sur **Add user** → **Create new user**
4. Entrez l'email et le mot de passe de l'admin
5. Cliquez sur **Create user**
6. **Copiez l'UUID** de l'utilisateur créé

### Étape 2 : Ajouter l'utilisateur à la table admin_users

Dans le **SQL Editor** de Supabase, exécutez :

```sql
-- Remplacez 'UUID_ICI' par l'UUID copié à l'étape précédente
INSERT INTO public.admin_users (id)
VALUES ('UUID_ICI');
```

Ou avec l'email de l'utilisateur :

```sql
-- Remplacez 'email@example.com' par l'email de l'admin
INSERT INTO public.admin_users (id)
SELECT id FROM auth.users WHERE email = 'email@example.com';
```

### Étape 3 : Se connecter

1. Allez sur `admin.html`
2. Entrez l'email et le mot de passe
3. Cliquez sur **Se connecter**

## 🔐 Sécurité

### Authentification à deux facteurs

Le système utilise deux niveaux de vérification :
1. **Authentification Supabase** - Vérifie email/mot de passe
2. **Vérification admin** - Vérifie que l'utilisateur est dans `admin_users`

Même si quelqu'un a un compte Supabase valide, il ne peut pas accéder au panneau admin s'il n'est pas dans la table `admin_users`.

### Politiques de sécurité (RLS)

La table `admin_users` a Row Level Security activé :
```sql
create policy "Users can check own admin status" on public.admin_users 
  for select using (auth.uid() = id);
```

Seuls les utilisateurs peuvent vérifier leur propre statut admin.

## 📝 Gestion des administrateurs

### Lister tous les admins

```sql
SELECT 
  au.id,
  u.email,
  au.created_at
FROM public.admin_users au
JOIN auth.users u ON u.id = au.id
ORDER BY au.created_at;
```

### Supprimer un admin

```sql
-- Par UUID
DELETE FROM public.admin_users WHERE id = 'UUID_ICI';

-- Par email
DELETE FROM public.admin_users 
WHERE id = (SELECT id FROM auth.users WHERE email = 'email@example.com');
```

### Vérifier si un utilisateur est admin

```sql
-- Par email
SELECT EXISTS (
  SELECT 1 FROM public.admin_users au
  JOIN auth.users u ON u.id = au.id
  WHERE u.email = 'email@example.com'
) as is_admin;
```

## 🔄 Migration depuis l'ancien système

Si vous utilisiez l'ancien système avec un mot de passe simple (`SV2026`), vous devez :

1. Créer au moins un compte admin (voir ci-dessus)
2. Tester la connexion
3. Une fois confirmé, l'ancien système ne sera plus utilisé

## 🐛 Dépannage

### "Email ou mot de passe incorrect"

- Vérifiez que l'utilisateur existe dans **Authentication** → **Users**
- Vérifiez que le mot de passe est correct
- Vérifiez les logs dans la console du navigateur

### "Accès non autorisé - Compte admin requis"

- L'utilisateur existe dans Supabase Auth mais pas dans `admin_users`
- Exécutez la requête de l'Étape 2 pour ajouter l'utilisateur

### "Supabase non disponible"

- Vérifiez que Supabase est correctement initialisé
- Vérifiez votre configuration dans `supabase-config.js`
- Vérifiez la console pour les erreurs de connexion

### La session expire rapidement

Par défaut, Supabase garde la session pendant 7 jours. Pour modifier :
```javascript
// Dans votre configuration Supabase
const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});
```

## 💡 Bonnes pratiques

### Mots de passe forts

Utilisez des mots de passe forts pour les comptes admin :
- Au moins 12 caractères
- Majuscules et minuscules
- Chiffres et symboles
- Pas de mots du dictionnaire

### Rotation des comptes

- Changez régulièrement les mots de passe
- Supprimez les comptes inutilisés
- Auditez régulièrement la liste des admins

### Logs et surveillance

Consultez régulièrement les logs d'authentification dans Supabase :
**Authentication** → **Logs**

## 🚀 Fonctionnalités avancées

### Ajouter des rôles

Vous pouvez étendre la table pour gérer différents niveaux d'accès :

```sql
ALTER TABLE public.admin_users 
ADD COLUMN role TEXT DEFAULT 'admin';

-- Créer un super admin
UPDATE public.admin_users 
SET role = 'super_admin' 
WHERE id = 'UUID_ICI';
```

### Notification par email

Utilisez les hooks Supabase pour envoyer un email quand un admin se connecte :

```sql
-- Exemple de fonction pour logger les connexions
CREATE OR REPLACE FUNCTION log_admin_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Votre logique de notification
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 📞 Support

En cas de problème avec l'authentification admin :
1. Vérifiez la documentation Supabase Auth
2. Consultez les logs dans la console
3. Vérifiez les policies RLS de la table `admin_users`
