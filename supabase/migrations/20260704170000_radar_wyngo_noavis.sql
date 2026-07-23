-- Retire la section "avis client" de l'article Wyngo (placeholder illustratif).
update public.radar_articles set body = replace(body,
'<h2 class="serif" style="font-family:Spectral,serif;font-size:26px;margin:34px 0 12px">La parole à un client</h2>
<p><strong>« Ils sont venus une journée entière dans ma boutique. Personne n’avait jamais pris ce temps-là »</strong>, témoigne Camille, fleuriste à Toulouse et cliente de Wyngo. « Le site qu’ils ont livré me ressemble vraiment — et surtout, mes clients me trouvent enfin sur Google. »</p>
',
'')
where slug = 'wyngo-decouverte-2026';
