-- ─── Plus aucune trace de l'ancien nom devant un prospect ─────────────
--
-- La prospection reprend demain. Tout ce qu'un prospect peut lire, voir à
-- l'écran ou recevoir doit porter Group Arsène.
--
-- On ne touche PAS :
--   • `messages` — ce sont des emails RÉELLEMENT envoyés sous l'ancien nom.
--     Les réécrire falsifierait l'historique commercial.
--   • `contracts` — le nom commercial engage juridiquement. Il doit
--     correspondre à ce qui est déclaré au RNE, pas à ce qui nous arrange.
--   • `radar_articles` — média public déjà indexé par Google ; changer le nom
--     d'une entité casse le référencement qu'on a construit. Décision de Hugo.
--   • `appointments.source` — valeur interne, jamais affichée.

-- ── 1. Les présentations montrées en 2e rendez-vous ──
-- Elles s'affichent en plein écran devant le prospect. Certaines portaient
-- encore « Votre futur site Wyngo » en titre de diapositive.
update public.pitch_decks
   set slides = replace(replace(slides::text, 'Wyngo', 'Group Arsène'), 'WYNGO', 'GROUP ARSÈNE')::jsonb
 where slides::text ilike '%wyngo%';

-- ── 2. Les sites clients : adresse canonique et partage social ──
-- Le lien qui apparaît quand on partage la page, et celui que Google retient.
update public.client_sites
   set html = replace(html, 'https://wyngoworkspace.bold-unit-739e.workers.dev',
                            'https://app.grouparsene.fr')
 where html like '%wyngoworkspace.bold-unit-739e.workers.dev%';

update public.client_sites
   set html_path = replace(html_path, 'https://wyngoworkspace.bold-unit-739e.workers.dev',
                                      'https://app.grouparsene.fr')
 where html_path like '%wyngoworkspace.bold-unit-739e.workers.dev%';

update public.prospect_previews
   set html_url = replace(html_url, 'https://wyngoworkspace.bold-unit-739e.workers.dev',
                                    'https://app.grouparsene.fr')
 where html_url like '%wyngoworkspace.bold-unit-739e.workers.dev%';

-- ── 3. L'adresse du site dans la signature des emails ──
-- Elle s'affiche en bas de chaque email envoyé à un prospect. Elle pointait
-- encore sur l'ancien domaine. grouparsene.fr ne répond pas aujourd'hui : y
-- renvoyer donnerait un lien mort en signature, ce qui est pire que rien.
-- On la vide en attendant que le domaine soit debout.
update public.agency_settings
   set website_url = null
 where website_url ilike '%wyngo%';
