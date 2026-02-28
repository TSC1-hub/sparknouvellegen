-- Ajoute la colonne etape à la table conversations
-- pour associer chaque message à l'étape active au moment de l'envoi.
-- DEFAULT 0 = tous les anciens messages sont rattachés à l'étape 0 (Découvrir).
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS etape integer DEFAULT 0;
