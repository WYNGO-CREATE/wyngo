-- Corrige les 3 dernières couvertures en doublon (images distinctes)
update public.radar_articles set cover_url='https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=70' where slug='anthropic-prudence-comme-arme';
update public.radar_articles set cover_url='https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=70' where slug='mistral-ai-pari-francais';
update public.radar_articles set cover_url='https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1200&q=70' where slug='comment-fonctionne-vraiment-ia';
