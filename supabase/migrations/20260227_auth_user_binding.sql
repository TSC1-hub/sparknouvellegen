-- Liaison progressive entre utilisateur métier (public.utilisateurs)
-- et identité Supabase Auth (auth.users)

alter table if exists public.utilisateurs
	add column if not exists auth_user_id uuid;

create unique index if not exists utilisateurs_auth_user_id_unique
	on public.utilisateurs(auth_user_id)
	where auth_user_id is not null;
