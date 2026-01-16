-- Nettoyer les doublons dans storage_data
-- À exécuter dans Supabase SQL Editor

-- 1. Voir les doublons actuels
SELECT storage_key, COUNT(*) as count
FROM storage_data
GROUP BY storage_key
HAVING COUNT(*) > 1;

-- 2. Supprimer les doublons (garder le plus récent)
DELETE FROM storage_data
WHERE id NOT IN (
  SELECT DISTINCT ON (storage_key) id
  FROM storage_data
  ORDER BY storage_key, updated_at DESC
);

-- 3. Ajouter une contrainte unique pour éviter les futurs doublons
ALTER TABLE storage_data 
ADD CONSTRAINT storage_key_unique UNIQUE (storage_key);

-- 4. Vérifier qu'il n'y a plus de doublons
SELECT storage_key, COUNT(*) as count
FROM storage_data
GROUP BY storage_key
HAVING COUNT(*) > 1;
