-- ─── Comptes collaborateurs : Nino et Lucas ──────────────────────────
--
-- Même schéma que le compte d'Ilyes. Le trigger handle_new_user crée le profil
-- et le rôle « collaborator » : chacun démarre donc avec un espace vide et ne
-- voit que ses propres prospects.
--
-- Idempotent : ne recrée rien si l'email existe déjà.

do $$
declare
  c record;
begin
  for c in
    select * from (values
      ('nino.bondon.dev@gmail.com', 'Nino',  'Arsene2026!Nino'),
      ('lucasepee3@gmail.com',      'Lucas', 'Arsene2026!Lucas')
    ) as t(email, prenom, mdp)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    )
    select
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
      'authenticated', 'authenticated', c.email,
      extensions.crypt(c.mdp, extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', c.prenom)
    where not exists (select 1 from auth.users u where u.email = c.email);

    insert into auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    )
    select u.email, u.id,
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      'email', now(), now(), now()
    from auth.users u
    where u.email = c.email
      and not exists (
        select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');
  end loop;
end $$;

-- GoTrue échoue avec « Database error querying schema » quand ces colonnes
-- sont NULL, ce qui est le cas après une création manuelle.
update auth.users set
  confirmation_token         = coalesce(confirmation_token, ''),
  recovery_token             = coalesce(recovery_token, ''),
  email_change               = coalesce(email_change, ''),
  email_change_token_new     = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change               = coalesce(phone_change, ''),
  phone_change_token         = coalesce(phone_change_token, ''),
  reauthentication_token     = coalesce(reauthentication_token, '')
where email in ('nino.bondon.dev@gmail.com', 'lucasepee3@gmail.com');
