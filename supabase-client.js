// === CLIENT SUPABASE LOCAL ===
// Importer Supabase depuis node_modules
import { createClient } from './node_modules/@supabase/supabase-js/dist/main.mjs';

const SUPABASE_CONFIG = {
    URL: 'https://vgbrwtkcdjbmjhirlqyf.supabase.co',
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnYnJ3dGtjZGpibWpoaXJscXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTkzOTgsImV4cCI6MjA4NDEzNTM5OH0.1QUWS46g1rfF0O_-GgNVXIkOK2BPIq0KGSsYRb58rJg'
};

// Créer le client Supabase
export const supabaseClient = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

// Rendre disponible globalement pour les scripts existants
window.supabase = { createClient };
window.supabaseClient = supabaseClient;
