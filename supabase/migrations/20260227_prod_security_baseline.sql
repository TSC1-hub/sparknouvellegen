-- Baseline sécurité prod (sans rupture UX)
-- Objectif: empêcher les écritures directes client sur public.vitrines.

DO $$
BEGIN
  IF to_regclass('public.vitrines') IS NULL THEN
    RAISE NOTICE 'Table public.vitrines absente, script ignoré.';
    RETURN;
  END IF;

  -- Active RLS au cas où
  EXECUTE 'ALTER TABLE public.vitrines ENABLE ROW LEVEL SECURITY';

  -- Supprime policy trop permissive si elle existe
  EXECUTE 'DROP POLICY IF EXISTS allow_all_vitrines ON public.vitrines';

  -- Nettoie puis recrée la policy lecture seule
  EXECUTE 'DROP POLICY IF EXISTS vitrines_read_all ON public.vitrines';
  EXECUTE 'CREATE POLICY vitrines_read_all ON public.vitrines FOR SELECT USING (true)';
END $$;

-- NOTE:
-- Aucune policy INSERT/UPDATE/DELETE n'est créée volontairement.
-- Donc les écritures directes client sont bloquées.
-- Les écritures passent par l'Edge Function sécurisée (service role + contrôle d'accès).
