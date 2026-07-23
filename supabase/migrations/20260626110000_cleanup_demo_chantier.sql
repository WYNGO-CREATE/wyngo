-- Nettoyage : suppression du/des chantier(s) de démonstration.
-- Le prospect démo (source='demo') casse en cascade client_sites,
-- portal_messages et site_metrics.
delete from public.prospects where source = 'demo';
