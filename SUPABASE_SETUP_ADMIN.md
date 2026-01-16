<!-- 
    Template à inclure dans les pages admin si vous voulez activer Supabase
    
    Incluez avant </body> dans admin.html, admin-storage.html, etc:
    
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="storage-adapter.js"></script>
    <script src="supabase-config.js"></script>
    
    ET optionnellement, pour ACTIVER automatiquement Supabase:
    <script>
        document.addEventListener('DOMContentLoaded', enableSupabaseStorage);
    </script>
-->

<!-- INSTRUCTIONS -->
<!-- 
Pour les pages PUBLIQUES (index.html, leaderboard.html, etc):
  - NE PAS inclure le CDN Supabase
  - Utiliser localStorage uniquement
  
Pour les pages ADMIN (admin.html, admin-storage.html, etc):
  - INCLURE le CDN Supabase
  - Charger storage-adapter.js et supabase-config.js
  - OPTIONNEL: Appeler enableSupabaseStorage() en console
-->
