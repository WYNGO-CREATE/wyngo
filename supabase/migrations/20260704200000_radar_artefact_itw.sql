-- Ajoute l'interview de Nino Bondon (avec son accord) avant "Un contre-pied assumé".
update public.radar_articles set body = replace(body,
'<h2 class="serif" style="font-family:Spectral,serif;font-size:26px;margin:34px 0 12px">Un contre-pied assumé</h2>',
'<h2 class="serif" style="font-family:Spectral,serif;font-size:26px;margin:34px 0 12px">La parole à Nino Bondon</h2>
<p><strong>« Tout le monde a vécu ça : une IA brillante, mais qui oublie tout d’une session à l’autre. On passe son temps à lui réexpliquer ce qu’elle savait la veille »</strong>, explique Nino Bondon, à l’origine du projet. « Ce gâchis, je ne pouvais pas m’en contenter. Artefact Neural, c’est ma réponse à un problème que des millions de gens vivent sans même le nommer. »</p>
<p>Sa ligne ne varie pas d’un iota : la mémoire doit rester chez celui à qui elle appartient. « Je ne veux pas d’une IA qui sait tout et à qui l’on confie tout. Je veux une IA qui vous connaît, vous, et qui respecte ce que vous savez — sans que vos données quittent jamais votre machine. C’est là, je crois, que se joue une vraie question de notre époque : à qui appartient ce que nous apprenons à nos outils. »</p>
<h2 class="serif" style="font-family:Spectral,serif;font-size:26px;margin:34px 0 12px">Un contre-pied assumé</h2>')
where slug = 'artefact-neural-decouverte';
