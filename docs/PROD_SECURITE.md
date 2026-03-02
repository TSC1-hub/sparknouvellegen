# Sécurité prod — SPARK · The Schools Challenge

> État au 2026-03-02 · Commit de référence : `905096d`

---

## État actuel de la sécurité

| Point | Statut | Notes |
|---|---|---|
| Écritures `vitrines` via Edge Function uniquement | ✅ | `verifierAccesEcritureVitrine()` — service role |
| RLS table `vitrines` — écriture client bloquée | ⚠️ | Script SQL prêt (`20260227_prod_security_baseline.sql`) — **à appliquer en prod** |
| Auth double (session + `actor_code`) | ✅ | Edge Function valide les deux |
| `invokeProxyMistral` — clé anon uniquement | ✅ | Fix 401 : plus de JWT ES256 envoyé à la gateway Supabase |
| `validerEtape` via Edge Function (service role) | ✅ | Action `equipe_valider_etape` — contourne les restrictions anon sur `equipes` |
| Rate-limit par `actor_code` | ✅ | 60 req/min Mistral · 30 req/min valider_etape · 10 req/min login |
| Logs d'audit structurés | ✅ | `logEvent()` — actor_code, equipe_id, action, durée, timestamp |
| Binding `auth_user_id` ↔ code métier | ✅ | Migration `20260227_auth_user_binding.sql` — vérification progressive |
| Secrets (`service_role`, clés API) côté serveur | ✅ | Uniquement dans les secrets Edge Function Supabase |
| Clé anon exposée côté client | ⚠️ | Normal pour Supabase — protégée par RLS en prod |
| CORS `Access-Control-Allow-Origin: *` | ❌ | **À restreindre** à `https://tsc1-hub.github.io` avant prod |
| Login JWT signé (vs simple code) | ❌ | Auth Supabase en session — nécessaire avant ouverture publique large |
| Monitoring + alertes Edge | ❌ | À configurer avant prod |

---

## Actions restantes avant production

### 1 — Appliquer le script RLS `vitrines` (5 min)

Dans le **SQL Editor Supabase** :

```sql
-- Contenu de supabase/migrations/20260227_prod_security_baseline.sql
ALTER TABLE public.vitrines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_vitrines ON public.vitrines;
DROP POLICY IF EXISTS vitrines_read_all  ON public.vitrines;
CREATE POLICY vitrines_read_all ON public.vitrines FOR SELECT USING (true);
-- Pas de policy INSERT/UPDATE/DELETE → écritures client bloquées
```

Effet : seule l'Edge Function (service role) peut écrire dans `vitrines`.

### 2 — Restreindre CORS (2 min)

Dans `supabase/functions/proxy-mistral/index.ts`, remplacer :

```typescript
"Access-Control-Allow-Origin": "*",
```

par :

```typescript
"Access-Control-Allow-Origin": "https://tsc1-hub.github.io",
```

Puis redéployer :

```bash
npx supabase functions deploy proxy-mistral --project-ref mqfkjikpdnpmynwtfjep
```

### 3 — RGPD : DPA Mistral (manuel)

Signer le Data Processing Agreement Mistral avant tout usage avec des mineurs :
- URL : https://mistral.ai/terms
- Gratuit, signature en ligne

### 4 — RGPD : Purge automatique des données (pg_cron)

Dans Supabase **Extensions**, activer `pg_cron`, puis exécuter :

```sql
SELECT cron.schedule(
  'purge-old-data',
  '0 3 1 * *',
  $$
    DELETE FROM public.conversations    WHERE created_at < NOW() - INTERVAL '9 months';
    DELETE FROM public.messages_mentors WHERE created_at < NOW() - INTERVAL '9 months';
  $$
);
```

### 5 — RGPD : Colonne consentement (migration SQL)

```sql
ALTER TABLE public.utilisateurs
  ADD COLUMN IF NOT EXISTS consentement_papier boolean DEFAULT false;
```

À cocher côté FAC lors de l'inscription d'une équipe (formulaire à ajouter dans l'interface).

---

## Historique des correctifs

| Date | Fix | Commit |
|---|---|---|
| 2026-02-27 | RLS vitrines + écriture via Edge Function | baseline |
| 2026-02-27 | Rate-limit + logs d'audit | baseline |
| 2026-02-27 | Binding auth_user_id ↔ code métier | `20260227_auth_user_binding.sql` |
| 2026-03-02 | `validerEtape` via Edge Function — fix reprise étape après déco/reco | `6ec7781` |
| 2026-03-02 | Fix 401 Invalid JWT — clé anon en Bearer (plus de JWT ES256) | `905096d` |
| 2026-03-02 | `saveMsg` robuste — fix Team→Mentor bloqué | `5d2e29f` |
| 2026-03-02 | `ensureEdgeSession` gère refresh tokens expirés | `5d2e29f` |
| 2026-03-02 | Action `equipe_valider_etape` avec garde-fou progression | `6ec7781` |
