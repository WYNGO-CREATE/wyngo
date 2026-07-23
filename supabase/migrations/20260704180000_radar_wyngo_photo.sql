-- Insère la photo du fondateur dans l'article Wyngo (avant "Un travail singulier").
update public.radar_articles set body = replace(body,
'<h2 class="serif" style="font-family:Spectral,serif;font-size:26px;margin:34px 0 12px">Un travail singulier, taillé sur mesure</h2>',
'<figure style="margin:28px auto;max-width:360px;text-align:center"><img src="https://le-radar-tech.vercel.app/hugo.jpg" alt="Hugo Malet, fondateur de Wyngo" style="width:100%;border-radius:4px;display:block"><figcaption style="font-size:13px;color:#5c5852;margin-top:6px;font-family:Libre Franklin,sans-serif">Hugo Malet, fondateur de Wyngo.</figcaption></figure>
<h2 class="serif" style="font-family:Spectral,serif;font-size:26px;margin:34px 0 12px">Un travail singulier, taillé sur mesure</h2>')
where slug = 'wyngo-decouverte-2026';
