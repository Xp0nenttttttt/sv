-- Script SQL pour le mode maintenance
-- Exécutez ce script dans SQL Editor de Supabase

-- 1. Créer la table site_settings pour stocker les paramètres globaux du site
CREATE TABLE IF NOT EXISTS site_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by TEXT
);

-- 2. Créer l'index
CREATE INDEX IF NOT EXISTS idx_setting_key ON site_settings(setting_key);

-- 3. Activer Row Level Security
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 4. Créer les policies
-- Policy pour les SELECT (tout le monde peut lire)
CREATE POLICY "Allow public select site_settings" ON site_settings
  FOR SELECT USING (true);

-- Policy pour les INSERT (tout le monde peut insérer)
CREATE POLICY "Allow public insert site_settings" ON site_settings
  FOR INSERT WITH CHECK (true);

-- Policy pour les UPDATE (tout le monde peut modifier)
CREATE POLICY "Allow public update site_settings" ON site_settings
  FOR UPDATE USING (true) WITH CHECK (true);

-- Policy pour les DELETE (tout le monde peut supprimer)
CREATE POLICY "Allow public delete site_settings" ON site_settings
  FOR DELETE USING (true);

-- 5. Insérer la valeur par défaut pour le mode maintenance (désactivé)
INSERT INTO site_settings (setting_key, setting_value, updated_by)
VALUES ('maintenance_mode', '{"enabled": false, "message": "Le site est actuellement en maintenance. Nous serons de retour bientôt!"}', 'system')
ON CONFLICT (setting_key) DO NOTHING;

-- Terminé!
