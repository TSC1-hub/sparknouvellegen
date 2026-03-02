# Suivi des chantiers — SPARK · The Schools Challenge

> Document de pilotage production. À mettre à jour après chaque évolution majeure.
>
> **Légende** — ✅ Livré · 🔧 En cours · ❌ À faire · ⚠️ Partiel / risque identifié

---

## Chantier 1 — Vue Élève

Parcours principal de l'élève : connexion, dialogue avec SPARK, progression par étapes, mise à jour de la vitrine.

| Fonctionnalité | Statut | Notes |
|---|---|---|
| Connexion par code élève | ✅ | Auth Supabase session + code legacy |
| Conversation SPARK par étape | ✅ | Variable `eleveEtapeAfficheeConversation`, filtre Supabase par `etape` |
| Sidebar 6 étapes cliquables | ✅ | `clickerEtapeSidebar(n)` — étape active mise en évidence |
| Lecture seule des étapes passées | ✅ | Header `conv-etape-header` + input désactivé |
| Auto-démarrage d'une étape vide | ✅ | `demarrerEtape()` — message de bienvenue automatique |
| Canal Mentor (lecture seule élève) | ✅ | Badge non-lu, realtime |
| Carnet de Terrain — onglet Vitrine | ✅ | `chargerCarnet()`, affichage par étape |
| Carnet de Terrain — onglet Édition HTML | ✅ | `renderCarnetEditionEtapes()` — édition manuelle |
| Bouton 🎨 Mettre à jour la vitrine | ✅ | `demanderMiseAJourVitrine()` — demande explicite à SPARK |
| Animation checkpoint (level-up) | ✅ | `animerDeblocage()`, `showStepOverlay()` |
| Sauvegarde carnet | ✅ | `sauvegarderCarnet()` — sync Supabase |

---

## Chantier 2 — Vue Mentor

Accès à la progression de l'équipe assignée et communication via canal dédié.

| Fonctionnalité | Statut | Notes |
|---|---|---|
| Connexion par code mentor | ✅ | |
| Liste des équipes assignées | ✅ | `initMentor()` — sidebar équipes |
| Vitrine live (iframe) par étape | ✅ | `chargerVitrinesMentor()`, pills de navigation par étape |
| Realtime vitrines équipe | ✅ | `listenVitrinesMentor()` |
| Panel 💬 Conversation SPARK (lecture seule) | ✅ | Affichage historique complet |
| Panel 🎓 Canal Mentor — envoi message | ✅ | Messages soumis à validation FAC |
| Réponses rapides | ✅ | `fillCompose()` |
| Realtime messages mentor | ✅ | Listener Supabase realtime |

---

## Chantier 3 — Vue Facilitateur

Supervision de toutes les équipes, validation des messages mentors, gestion des données.

| Fonctionnalité | Statut | Notes |
|---|---|---|
| Connexion par code facilitateur | ✅ | |
| Dashboard liste équipes avec cards | ✅ | `initFac()` — indicateur étape courante |
| Drawer par équipe | ✅ | Vitrine par étape + conv + canal mentor |
| Validation / refus messages mentors | ✅ | `renderFacValidation()` |
| Realtime messages mentors | ✅ | `listenFacMentorMessages()` |
| Suppression conversation + vitrines | ✅ | `supprimerConversationEquipe()` |
| Reset équipe (étape_courante → 0) | ✅ | Bouton reset dans le drawer |

---

## Chantier 4 — IA & Checkpoints

Intégration Mistral, prompts personnalisés, détection automatique de progression.

| Fonctionnalité | Statut | Notes |
|---|---|---|
| Appel Mistral via Edge Function | ✅ | `callMistral()` → `proxy-mistral` |
| Prompt système par étape (table `prompts`) | ✅ | Chargé depuis Supabase au démarrage |
| Historique intégral transmis à Mistral | ✅ | Toutes les étapes de l'équipe incluses |
| Détection checkpoint dans la réponse SPARK | ✅ | `detecterCheckpoint(texte)` + regex |
| Déblocage étape suivante | ✅ | `validerEtape()` — mise à jour `equipes.etape_courante` |
| Génération HTML vitrine par SPARK | ✅ | `detecterCheckpoint(texte, forceVitrine=true)` |
| Overlay level-up animé | ✅ | `showStepOverlay()` / `closeStepOverlay()` |
| Gestion des erreurs appel Mistral | ⚠️ | Pas de retry automatique — message d'erreur affiché |

---

## Chantier 5 — Sécurité & Infrastructure

Voir aussi [`docs/PROD_SECURITE.md`](PROD_SECURITE.md) pour le détail.

| Fonctionnalité | Statut | Notes |
|---|---|---|
| Écriture vitrines via Edge Function uniquement | ✅ | `verifierAccesEcritureVitrine()` |
| Vérification auth double (session + actor_code) | ✅ | Edge Function `proxy-mistral` |
| Appel Edge Function avec clé anon (fix 401) | ✅ | `invokeProxyMistral` envoie toujours `Bearer SUPABASE_KEY` — plus de JWT ES256 |
| `validerEtape` via Edge Function (service role) | ✅ | Nouvelle action `equipe_valider_etape` — fix reprise étape après déco/reco |
| Team → Mentor : `saveMsg` robuste | ✅ | Fix 401 sur INSERT `conversations` |
| `ensureEdgeSession` robuste (refresh + nouv. session) | ✅ | Gestion tokens expirés et refresh tokens périmés |
| RLS table `vitrines` — écriture client interdite | ⚠️ | Script SQL fourni, à appliquer en prod (voir PROD_SECURITE.md §1) |
| Rate-limit par actor_code | ✅ | Implémenté dans l'Edge Function (60 req/min Mistral, 30 valider_etape) |
| Logs d'audit (actor_code, équipe, action, timestamp) | ✅ | `logEvent()` dans l'Edge Function |
| Login par code → session JWT signée | ❌ | Auth Supabase réelle — nécessaire avant ouverture publique |
| Monitoring + alertes erreurs Edge | ❌ | À configurer avant prod |
| Secrets (`service_role`, clés API) côté serveur uniquement | ⚠️ | Clé anon exposée côté client (normal), service_role uniquement dans l'Edge |

---

## Chantier 6 — Base de données

Structure Supabase, migrations, politiques d'accès.

| Élément | Statut | Notes |
|---|---|---|
| Table `equipes` | ✅ | `etape_courante`, `code`, etc. |
| Table `utilisateurs` + `roles` | ✅ | Rôles : élève, mentor, facilitateur |
| Table `conversations` | ✅ | Colonne `etape integer DEFAULT 0` ajoutée (migration `20260228_conversations_etape.sql`) |
| Table `vitrines` | ✅ | HTML par étape par équipe |
| Table `prompts` | ✅ | Prompts système par étape |
| Table `messages_mentors` | ✅ | Canal mentor + statut validation |
| Table `mentor_equipes` | ✅ | Assignation mentor ↔ équipe |
| RLS `conversations` | ⚠️ | À vérifier — lecture restreinte à l'équipe |
| RLS `messages_mentors` | ⚠️ | À vérifier — accès mentor / FAC uniquement |
| Indexes de performance | ❌ | Index sur `equipe_id` + `etape` pour `conversations` |
| Seed de démo / données de test | ⚠️ | `supabase/seed.sql` partiel — à compléter |

---

## Chantier 7 — UX & Design

Expérience utilisateur, responsive, animations.

| Fonctionnalité | Statut | Notes |
|---|---|---|
| Responsive mobile (toutes vues) | ⚠️ | `@media` présents — à tester sur vrais terminaux |
| Animations sidebar (step-connector beam) | ✅ | CSS `validating` / `unlocking` / `beam` |
| Dark mode / thème | ❌ | Non implémenté |
| Avatar SPARK / ring IG | ✅ | Styling vitrine-pill actif |
| Accessibilité (a11y) | ❌ | Pas de revue ARIA / contraste systematique |
| États vides / loading / erreur cohérents | ⚠️ | Partiels — certains états sans feedback visuel |
| Transitions entre vues (Élève / Mentor / FAC) | ⚠️ | Rechargement complet — pas d'animation |

---

## Chantier 8 — Tests & Qualité

| Type de test | Statut | Notes |
|---|---|---|
| Parcours élève complet (connexion → checkpoint) | ❌ | Aucun test automatisé |
| Parcours mentor (consultation + message) | ❌ | |
| Parcours facilitateur (validation + reset) | ❌ | |
| Appel Edge Function (auth OK / auth KO) | ❌ | |
| Test RLS (écriture directe bloquée) | ❌ | |
| Test multi-équipes simultanées | ❌ | |
| Test realtime (Supabase channels) | ❌ | |

---

## Chantier 9 — RGPD & Conformité

Contexte : programme scolaire avec mineurs. Le DPA Mistral et la purge des données sont les deux points bloquants pour un déploiement conforme.

| Action | Statut | Détail |
|---|---|---|
| DPA (Data Processing Agreement) Mistral signé | ❌ | À signer manuellement sur https://mistral.ai/terms avant usage en production avec mineurs |
| Purge automatique des données | ❌ | `pg_cron` — DELETE conversations + messages WHERE `created_at < NOW() - INTERVAL '9 months'` |
| Colonne `consentement_papier` | ❌ | `ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS consentement_papier boolean DEFAULT false;` |
| CORS restreint à l'origine prod | ⚠️ | Edge Function actuellement `"Access-Control-Allow-Origin": "*"` — à restreindre à `https://tsc1-hub.github.io` |
| Politique de conservation documentée | ❌ | Définir durée de conservation dans mentions légales / CGU |
| Pas de données personnelles identifiantes stockées | ✅ | Seuls pseudos + codes équipe — pas de nom réel ni email |
| Logs Edge Function sans PII | ✅ | Logs limites à `actor_code`, `equipe_id`, action — pas de contenu de messages |

### Ce qu'il faut faire avant tout usage avec mineurs en production

1. **DPA Mistral** : https://mistral.ai/terms — signature manuelle, gratuit
2. **CORS** : dans `supabase/functions/proxy-mistral/index.ts`, remplacer `"*"` par `"https://tsc1-hub.github.io"`
3. **Purge** : activer `pg_cron` dans Supabase (Extensions) + créer le job SQL ci-dessous
4. **Consentement** : ajouter la colonne + cocher dans l’interface FAC lors de l’inscription d’une équipe

```sql
-- Job de purge à exécuter 1x/mois (extension pg_cron requise)
SELECT cron.schedule(
  'purge-old-data',
  '0 3 1 * *',  -- 1er du mois à 3h
  $$
    DELETE FROM public.conversations  WHERE created_at < NOW() - INTERVAL '9 months';
    DELETE FROM public.messages_mentors WHERE created_at < NOW() - INTERVAL '9 months';
  $$
);
```

---

## Récapitulatif priorités

### Avant ouverture publique (bloquant)

1. ❌ **DPA Mistral** signé — obligatoire avec mineurs
2. ❌ **CORS restreint** — remplacer `"*"` par `"https://tsc1-hub.github.io"` dans l’Edge
3. ❌ **Purge data** `pg_cron` 9 mois — obligation RGPD
4. ⚠️ **RLS vitrines** — appliquer le script SQL (PROD_SECURITE.md §1)
5. ❌ **Login JWT** — remplacer auth par simple code par session Supabase signée
6. ⚠️ **Secrets** — audit final aucune clé service_role exposée côté client

### Recommandé avant beta large

7. ❌ **Colonne `consentement_papier`** — suivi consentement par équipe
8. ❌ **Tests parcours** élève + mentor + FAC
9. ⚠️ **RLS conversations & messages_mentors** — vérification
10. ❌ **Indexes BDD** — performance sous charge

### Améliorations non bloquantes

11. ❌ Dark mode
12. ❌ Accessibilité a11y
13. ⚠️ Responsive mobile — tests terminaux réels
14. ❌ Animations de transition entre vues

---

*Dernière mise à jour : 2026-03-02 · Commit de référence : `905096d`*
