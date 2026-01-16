-- === SCRIPT SQL CORRECT POUR SUPABASE ===
-- Exécutez ce script dans SQL Editor de Supabase

-- 1. Créer la table
CREATE TABLE IF NOT EXISTS storage_data (
  id BIGSERIAL PRIMARY KEY,
  storage_key TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Créer l'index
CREATE INDEX IF NOT EXISTS idx_storage_key ON storage_data(storage_key);

-- 3. Activer Row Level Security
ALTER TABLE storage_data ENABLE ROW LEVEL SECURITY;

-- 4. Créer les policies (une par action)
-- Policy pour les SELECT (lectures)
CREATE POLICY "Allow public select" ON storage_data
  FOR SELECT USING (true);

-- Policy pour les INSERT (écritures)
CREATE POLICY "Allow public insert" ON storage_data
  FOR INSERT WITH CHECK (true);

-- Policy pour les UPDATE (modifications)
CREATE POLICY "Allow public update" ON storage_data
  FOR UPDATE USING (true) WITH CHECK (true);

-- Policy pour les DELETE (suppressions)
CREATE POLICY "Allow public delete" ON storage_data
  FOR DELETE USING (true);

-- Terminé!
