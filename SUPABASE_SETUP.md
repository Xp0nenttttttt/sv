# 🔧 Configuration Supabase - README

Pour activer le stockage Supabase, suivez ces étapes:

## 1️⃣ Créer un Compte Supabase

Visitez: https://supabase.com/auth/sign-up

## 2️⃣ Créer un Projet

- Cliquez sur "New project"
- Nommez-le "sv-challenge-list"
- Conservez les identifiants de connexion

## 3️⃣ Créer la Table

Accédez à SQL Editor dans Supabase et exécutez:

```sql
CREATE TABLE storage_data (
  id BIGSERIAL PRIMARY KEY,
  storage_key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_storage_key ON storage_data(storage_key);

ALTER TABLE storage_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON storage_data
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert/update/delete" ON storage_data
  FOR INSERT, UPDATE, DELETE WITH CHECK (true);
```

## 4️⃣ Obtenir les Identifiants

Dans Supabase, allez à Settings > API > Voici les clés:
- **Project URL**: https://xxx.supabase.co
- **Anon Key**: eyXXXXXXX

## 5️⃣ Configurer l'Application

Dans `index.html`, ajoutez avant le `</body>`:

```html
<!-- Supabase (optional - pour migration future) -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="storage-adapter.js"></script>

<!-- Si vous voulez activer Supabase maintenant, décommentez -->
<!--
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const supabaseAdapter = new SupabaseStorageAdapter(
      'https://xxx.supabase.co',
      'votre-anon-key'
    );
    universalStorage.switchAdapter(supabaseAdapter);
    console.log('✅ Supabase Storage activé');
  });
</script>
-->
```

## 6️⃣ Tester la Connexion

Ouvrez la Console du Navigateur (F12) et exécutez:

```javascript
// Test de connexion
const adapter = new SupabaseStorageAdapter(
  'https://xxx.supabase.co',
  'votre-anon-key'
);

adapter.setData('test-key', { hello: 'world' })
  .then(() => console.log('✅ Écriture réussie'))
  .catch(err => console.error('❌ Erreur:', err));

adapter.getData('test-key')
  .then(data => console.log('✅ Lecture réussie:', data))
  .catch(err => console.error('❌ Erreur:', err));
```

## 7️⃣ Migrer les Données

Créez un fichier `migrate-to-supabase.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Migration → Supabase</title>
    <style>
        body { font-family: Arial; max-width: 600px; margin: 50px auto; }
        button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
        #log { border: 1px solid #ddd; padding: 20px; height: 300px; overflow-y: auto; margin-top: 20px; }
        .success { color: green; }
        .error { color: red; }
    </style>
</head>
<body>
    <h1>📤 Migration localStorage → Supabase</h1>
    
    <div>
        <label>
            URL Supabase:
            <input type="text" id="url" placeholder="https://xxx.supabase.co" style="width: 100%; margin-top: 5px;">
        </label>
    </div>

    <div style="margin-top: 15px;">
        <label>
            Clé Supabase:
            <input type="password" id="key" placeholder="eyXXXXXXX" style="width: 100%; margin-top: 5px;">
        </label>
    </div>

    <button onclick="startMigration()" style="margin-top: 20px; width: 100%; background: #667eea; color: white; border: none; border-radius: 5px; padding: 12px;">
        🚀 Démarrer Migration
    </button>

    <div id="log"></div>

    <script src="submission.js"></script>
    <script src="record-submission.js"></script>
    <script src="storage-adapter.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

    <script>
        function log(message, isError = false) {
            const logDiv = document.getElementById('log');
            const line = document.createElement('div');
            line.className = isError ? 'error' : 'success';
            line.textContent = message;
            logDiv.appendChild(line);
            logDiv.scrollTop = logDiv.scrollHeight;
        }

        async function startMigration() {
            const url = document.getElementById('url').value;
            const key = document.getElementById('key').value;

            if (!url || !key) {
                log('❌ Veuillez remplir l\'URL et la clé', true);
                return;
            }

            try {
                log('⏳ Initialisation de Supabase...');
                const supabaseAdapter = new SupabaseStorageAdapter(url, key);

                log('📊 Récupération des données...');
                const localStorage_adapter = new LocalStorageAdapter();
                const keys = await localStorage_adapter.getAllKeys();

                log(`📦 ${keys.length} clé(s) trouvée(s)`);

                let migrated = 0;
                for (const key of keys) {
                    const data = await localStorage_adapter.getData(key);
                    await supabaseAdapter.setData(key, data);
                    migrated++;
                    log(`✅ [${migrated}/${keys.length}] ${key}`);
                }

                log('🎉 Migration terminée avec succès!');
                log('Vous pouvez maintenant activer Supabase dans index.html');
            } catch (error) {
                log(`❌ Erreur: ${error.message}`, true);
                console.error(error);
            }
        }
    </script>
</body>
</html>
```

## ⚠️ Sécurité en Production

Les RLS (Row Level Security) actuels permettent à **tout le monde** de lire/écrire.

Pour un usage en production, implémentez:
```sql
-- Authentification requise
CREATE POLICY "Authenticated users only" ON storage_data
  FOR ALL USING (auth.role() = 'authenticated');
```

## 📞 Support

- **Documentation Supabase**: https://supabase.com/docs
- **Issues**: Consultez MIGRATION_GUIDE.md pour plus de détails

---

**État**: ✅ Prêt pour la migration. localStorage fonctionne actuellement, Supabase peut être activé quand vous le souhaitez.
