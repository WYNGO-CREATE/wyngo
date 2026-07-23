-- Crée le compte collaborateur "Ilyes" (login email + mot de passe).
-- Le trigger handle_new_user crée automatiquement son profil + user_roles = 'collaborator'.
-- Idempotent : ne recrée pas si l'email existe déjà.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
select
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
  'authenticated', 'authenticated', 'ilyes@wyngo.fr',
  extensions.crypt('Wyngo2026!Ilyes', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Ilyes"}'::jsonb
where not exists (select 1 from auth.users where email = 'ilyes@wyngo.fr');

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select u.email, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u
where u.email = 'ilyes@wyngo.fr'
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');
