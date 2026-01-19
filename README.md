OPTION B – MODULE AUTH

1) Configure core/supabase.js avec tes clés
2) Lien bouton Compte:
   - connecté → auth/account.html
   - sinon → auth/login.html
3) Protéger une page:
   import { requireAuth } from "./auth/guard.js";
   await requireAuth();