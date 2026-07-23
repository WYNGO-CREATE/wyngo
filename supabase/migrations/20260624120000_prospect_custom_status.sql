-- Statut personnalisé libre (saisi par l'utilisateur, ex. "Devis envoyé", "En négociation").
-- Le statut "built-in" (enum prospect_status) reste pour la logique métier (suggestions, KPIs) ;
-- le statut effectif affiché dans le Kanban = custom_status s'il est défini, sinon status.
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS custom_status text;
CREATE INDEX IF NOT EXISTS idx_prospects_custom_status ON public.prospects(custom_status);
