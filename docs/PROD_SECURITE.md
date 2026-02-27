# Migration prod sans rupture (version noob-friendly)

Objectif: garder la même application côté utilisateur, mais fermer les failles de sécurité avant un vrai déploiement public.

## Niveau actuel (après durcissement)

- ✅ Écritures `vitrines` passent par l’Edge Function.
- ✅ L’Edge vérifie que l’utilisateur (`actor_code`) a le droit d’écrire pour l’équipe.
- ⚠️ Il reste à fermer proprement les policies SQL côté table `vitrines`.
- ⚠️ Le login par simple code reste faible pour une vraie prod internet.

---

## Plan en 5 actions

## 1) Fermer la table `vitrines` côté client (urgent)

Dans Supabase SQL Editor, exécute le script de:

- [supabase/migrations/20260227_prod_security_baseline.sql](supabase/migrations/20260227_prod_security_baseline.sql)

Effet:
- lecture autorisée,
- écriture directe client interdite,
- seules les écritures via Edge Function autorisée restent possibles.

## 2) Tester les parcours sans changer l’UX

Checklist (dans l’app):
- élève envoie un message,
- SPARK modifie la vitrine,
- sauvegarde carnet fonctionne,
- facilitateur édite une vitrine,
- mentor continue de fonctionner.

Attendu: tout fonctionne comme avant.

## 3) Bloquer les abus réseau simples

Dans l’Edge Function `proxy-mistral`, ajouter ensuite (étape suivante):
- rate-limit par `actor_code` (ex: 30 requêtes / minute),
- logs d’audit (`actor_code`, `equipe_id`, action, timestamp, résultat).

## 4) Passer de “code-only login” à une vraie session

C’est la vraie marche vers la prod:
- utiliser Supabase Auth (JWT) au login,
- garder les codes d’équipe, mais les échanger contre une session signée,
- vérifier le JWT dans l’Edge (en plus de `actor_code`).

## 5) Bascule prod en sécurité

Avant ouverture publique:
- revérifier qu’aucune policy `FOR ALL USING (true)` n’existe,
- revérifier les secrets (`service_role`, clés API) uniquement côté serveur,
- activer monitoring + alertes d’erreurs Edge.

---

## Réponse à la question “est-ce que ça cassera l’app ?”

Si on suit ce plan dans cet ordre: non.

- Les étapes 1 et 2 sont conçues pour garder le fonctionnement actuel.
- Les étapes 3-5 renforcent la sécurité progressivement, sans casser l’UX.

Le seul endroit qui peut demander un ajustement est le HTML vitrine si le contenu est invalide ou mal formé (normal et gérable).