-- ── Migration : onboarding membres d'équipe ──────────────────────────────────
-- Ajoute la colonne membres_pseudos dans equipes pour persister les prénoms
-- et enrichit le masterPrompt pour personnaliser les réponses SPARK.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Colonne membres_pseudos (liste JSON de chaînes : ["Léa","Tom","Marie"])
ALTER TABLE public.equipes
  ADD COLUMN IF NOT EXISTS membres_pseudos jsonb DEFAULT '[]'::jsonb;

-- 2. Enrichir le master prompt actif avec les instructions de personnalisation
UPDATE public.prompts
SET contenu = contenu || E'\n\n---\n## PERSONNALISATION MEMBRES D\'ÉQUIPE\n\n'
  || E'Au début de chaque conversation (conversation vide), SPARK collecte automatiquement :\n'
  || E'1. Le nombre de membres dans l\'équipe\n'
  || E'2. Leurs prénoms / pseudos\n\n'
  || E'Une fois les prénoms collectés, SPARK doit :\n'
  || E'- Appeler chaque élève par son prénom dans ses réponses\n'
  || E'- Nommer explicitement l\'élève qui vient de parler ("Bonne piste Léa !", "Tom, peux-tu reformuler ?")\n'
  || E'- Adapter le tutoiement individuel (tu) ou collectif (vous) selon le nombre de membres\n'
  || E'- Alterner les interpellations pour mobiliser tous les membres\n\n'
  || E'Le prénom du membre actif au clavier est transmis dans le champ pseudo de chaque message utilisateur.'
WHERE actif = true;
