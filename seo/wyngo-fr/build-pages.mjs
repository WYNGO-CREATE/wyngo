// ─────────────────────────────────────────────────────────────────────────
// build-pages.mjs — Génère les pages de réponse de wyngo.fr
//
// POURQUOI : wyngo.fr était UNE seule page. Une page = une seule porte
// d'entrée pour Google et pour les aperçus IA. Ces pages ciblent chacune une
// question réellement tapée par les prospects, et y répondent en tête de page
// (c'est cet extrait que les aperçus IA citent).
//
// RÈGLE ABSOLUE : aucun chiffre, aucune promesse qui ne soit déjà sur wyngo.fr.
// On ne fabrique pas de tarif, de délai ni de référence client.
//
// Usage : node build-pages.mjs   (puis vercel deploy --prod)
// ─────────────────────────────────────────────────────────────────────────
import { writeFileSync } from "node:fs";

const SITE = "https://wyngo.fr";
const TEL = "+33619379269";
const TEL_AFF = "06 19 37 92 69";
const KG = "https://www.google.com/search?kgmid=/g/11zcsg1p32";
const MAJ = "2026-07-24";

// Identité visuelle reprise à l'identique du site.
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#F7F4EC;--bg2:#F0ECE0;--card:#FCFBF6;--ink:#141410;--mut:#14141099;--mut2:#14141066;--line:#14141021;--accent:#1B4BE3}
body{background:var(--bg);color:var(--ink);font:16px/1.65 Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:760px;margin:0 auto;padding:0 24px}
nav{border-bottom:1px solid var(--line);background:var(--bg)}
nav .wrap{display:flex;align-items:center;justify-content:space-between;height:64px}
.wm{font:600 20px/1 Inter,sans-serif;letter-spacing:-.02em}
.wm-tag{display:block;font-size:11px;color:var(--mut2);margin-top:3px;letter-spacing:.02em}
nav a{color:var(--mut);text-decoration:none;font-size:14px}
nav a:hover{color:var(--ink)}
header{padding:64px 0 40px}
.bc{font-size:13px;color:var(--mut2);margin-bottom:20px}
.bc a{color:var(--mut);text-decoration:none}.bc a:hover{color:var(--ink)}
h1{font:400 clamp(30px,5vw,44px)/1.15 Georgia,'Times New Roman',serif;letter-spacing:-.02em;margin-bottom:20px}
.lede{font-size:19px;line-height:1.6;color:var(--ink);border-left:3px solid var(--accent);padding-left:20px;margin-bottom:8px}
main{padding-bottom:72px}
h2{font:400 clamp(22px,3.4vw,28px)/1.25 Georgia,serif;margin:44px 0 14px;letter-spacing:-.01em}
h3{font:600 17px/1.4 Inter,sans-serif;margin:26px 0 8px}
p{margin-bottom:14px;color:#141410cc}
ul{margin:0 0 16px 20px}li{margin-bottom:8px;color:#141410cc}
strong{color:var(--ink);font-weight:600}
a{color:var(--accent)}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:24px;margin:28px 0}
.faq{border-top:1px solid var(--line);padding-top:18px;margin-top:14px}
.faq h3{margin-top:0}
.cta{background:var(--ink);color:#F7F4EC;border-radius:16px;padding:34px;margin:48px 0 0;text-align:center}
.cta h2{color:#F7F4EC;margin:0 0 10px}
.cta p{color:#F7F4ECb3;margin-bottom:22px}
.btn{display:inline-block;background:var(--accent);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px}
.rel{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.rel a{font-size:14px;background:var(--bg2);border:1px solid var(--line);padding:8px 14px;border-radius:999px;text-decoration:none;color:var(--ink)}
footer{border-top:1px solid var(--line);padding:28px 0;font-size:13px;color:var(--mut2)}
footer a{color:var(--mut)}
@media(max-width:600px){header{padding:40px 0 28px}.lede{font-size:17px}}
`;

// Chaque page vise une question réelle. `reponse` est LA réponse directe que
// les aperçus IA extraient : concise, factuelle, autoportante.
const PAGES = [
  {
    slug: "creation-site-internet-toulouse",
    title: "Création de site internet à Toulouse — Wyngo",
    h1: "Création de site internet à Toulouse",
    desc: "Sites internet sur-mesure pour artisans, commerçants et TPE à Toulouse. Immersion sur le terrain, textes et photos inclus, code source remis.",
    reponse:
      "Wyngo est un cabinet de présence digitale basé à Toulouse qui conçoit des sites internet sur-mesure pour les artisans, commerçants, professions libérales et TPE. La particularité de sa méthode : une journée d'immersion dans l'entreprise du client, pendant laquelle les textes sont rédigés et les photos produites sur place. Le code source est remis au client à la livraison.",
    sections: [
      { h: "Une méthode qui commence sur le terrain", p: [
        "La plupart des sites échouent pour une raison simple : ils sont écrits depuis un bureau, par quelqu'un qui n'a jamais vu le métier de près. Le résultat est une brochure interchangeable, qui pourrait appartenir à n'importe quel concurrent.",
        "Wyngo procède autrement. Le travail commence par une <strong>journée d'immersion</strong> dans votre entreprise : on observe comment vous travaillez, ce que vous dites à vos clients, ce qui vous distingue réellement. Les textes sont rédigés à partir de ce que vous dites vraiment, et les photos sont produites sur place — pas achetées sur une banque d'images.",
      ]},
      { h: "Ce que comprend la prestation", p: [
        "Tout le travail est inclus, sans ligne surprise :",
      ], ul: [
        "Une journée d'immersion dans votre entreprise",
        "La rédaction complète de vos textes",
        "La production de vos photos",
        "L'optimisation du référencement local",
        "La remise du code source — le site vous appartient entièrement",
      ]},
      { h: "Pour qui ?", p: [
        "Artisans et commerçants, professions libérales, startups et PME de Toulouse et sa périphérie — jusqu'à une trentaine de kilomètres. Chaque métier a ses codes : un site de boulangerie ne se construit pas comme un site de cabinet d'avocats.",
      ]},
    ],
    faq: [
      { q: "Combien de temps faut-il pour créer un site internet ?", a: "Chez Wyngo, la première maquette est présentée sous 48 heures et la mise en ligne intervient sous 21 jours. Ce rythme est possible parce que le cabinet ne sélectionne que 9 entrepreneurs par trimestre." },
      { q: "Le site m'appartient-il vraiment ?", a: "Oui. Le code source vous est remis à la livraison : vous n'êtes prisonnier d'aucun prestataire et pouvez faire évoluer votre site où vous le souhaitez." },
      { q: "Faut-il payer avant de voir quelque chose ?", a: "Non. Aucun euro n'est demandé avant que vous validiez la première maquette. Vous ne payez que si le travail vous convainc." },
    ],
  },
  {
    slug: "prix-creation-site-internet-toulouse",
    title: "Prix d'un site internet à Toulouse — Wyngo",
    h1: "Combien coûte un site internet pour une TPE ?",
    desc: "Ce qui détermine réellement le prix d'un site internet professionnel : le contenu, les photos, le référencement et le suivi. Et la garantie Wyngo : 0 € avant validation de la maquette.",
    reponse:
      "Le prix d'un site internet professionnel dépend surtout de ce qui n'est pas visible : qui rédige les textes, qui produit les photos, si le référencement local est traité, et si un suivi est assuré après la mise en ligne. Un site livré sans contenu propre coûte moins cher à produire, mais laisse tout le travail au client. Chez Wyngo, aucun paiement n'est demandé avant que le client ait validé la première maquette.",
    sections: [
      { h: "Les quatre postes qui font vraiment le prix", p: [
        "Comparer deux devis de sites internet n'a aucun sens si on ne compare pas ce qu'ils contiennent. Quatre postes expliquent l'essentiel de l'écart :",
      ], ul: [
        "<strong>Le contenu</strong> — des textes rédigés spécifiquement pour votre métier, ou des paragraphes génériques à remplir vous-même ?",
        "<strong>Les visuels</strong> — des photos de votre entreprise, ou des images de banque que vos concurrents utilisent aussi ?",
        "<strong>Le référencement local</strong> — le site est-il conçu pour ressortir sur les recherches de votre ville, ou simplement mis en ligne ?",
        "<strong>Le suivi</strong> — quelqu'un mesure-t-il les résultats après la livraison, ou le site est-il abandonné le jour de la mise en ligne ?",
      ]},
      { h: "Le piège du site pas cher", p: [
        "Un site à bas coût n'est pas une économie s'il ne ramène personne. Le coût réel d'un site invisible, c'est l'ensemble des clients qui ont cherché votre métier dans votre ville et ont trouvé un concurrent. Ce coût-là ne figure sur aucun devis.",
      ]},
      { h: "La garantie Wyngo", p: [
        "Pour lever le risque, le cabinet applique une règle simple : <strong>aucun euro n'est demandé avant que vous ayez validé la première maquette</strong>. Vous voyez d'abord, vous décidez ensuite. Et le code source vous est remis, donc vous n'êtes jamais captif.",
      ]},
    ],
    faq: [
      { q: "Qu'est-ce qui est inclus dans le prix d'un site Wyngo ?", a: "L'intégralité du travail : une journée d'immersion, la rédaction de vos textes, la production de vos photos, l'optimisation du référencement local, et la remise du code source — le site vous appartient en entier." },
      { q: "Comment être sûr du retour sur investissement ?", a: "Parce qu'on ne construit pas une vitrine mais un outil de conversion : chaque page, chaque image, chaque ligne a un rôle — faire passer un visiteur à l'action. Et les résultats sont mesurés chaque mois." },
      { q: "Y a-t-il un acompte à verser ?", a: "Non. Aucun paiement n'est demandé avant la validation de la première maquette." },
    ],
  },
  {
    slug: "referencement-local-google-toulouse",
    title: "Être visible sur Google à Toulouse : référencement local — Wyngo",
    h1: "Comment être visible sur Google quand on est une entreprise locale ?",
    desc: "Les leviers réels du référencement local à Toulouse : fiche Google Business, cohérence des informations, avis clients et contenu ancré dans la ville.",
    reponse:
      "Pour qu'une entreprise locale apparaisse sur Google, quatre éléments comptent avant tout : une fiche Google Business complète et vérifiée, des informations strictement identiques partout sur le web (nom, adresse, téléphone), des avis clients authentiques et réguliers, et un site dont le contenu est réellement ancré dans la ville et le métier. La proximité géographique du chercheur joue aussi un rôle déterminant.",
    sections: [
      { h: "La fiche Google Business passe avant le site", p: [
        "Pour une recherche locale, c'est souvent la fiche Google Business — pas le site — qui décide de votre visibilité. Une fiche incomplète, sans photos ni horaires, sans catégorie précise, ne ressort pas. C'est le premier chantier, avant toute refonte.",
      ]},
      { h: "La cohérence des informations", p: [
        "Google recoupe en permanence votre nom, votre adresse et votre téléphone à travers tout le web. La moindre variation — un numéro différent ici, une orthographe changée là — affaiblit le lien entre vos différentes présences. <strong>Un seul numéro, une seule orthographe, partout.</strong>",
      ]},
      { h: "Les avis, levier le plus sous-estimé", p: [
        "Les avis clients pèsent lourd dans le classement local, et surtout ils déterminent le clic. À classement égal, une entreprise avec vingt avis récents l'emporte sur une entreprise sans avis. C'est le levier le moins coûteux et le plus rapide à activer.",
      ]},
      { h: "Un contenu réellement local", p: [
        "Un site qui ne nomme jamais sa ville, ses quartiers, ses interventions concrètes, ne donne à Google aucune raison de le rattacher à un territoire. Le contenu doit dire où vous travaillez et pour qui.",
      ]},
    ],
    faq: [
      { q: "Combien de temps pour voir des résultats en référencement local ?", a: "Le référencement local demande de la constance : les effets d'une fiche complétée et d'avis réguliers se voient généralement en quelques semaines, tandis que l'autorité d'un site se construit sur plusieurs mois." },
      { q: "Faut-il un site pour apparaître sur Google Maps ?", a: "Non, une fiche Google Business suffit pour apparaître sur Maps. Mais un site cohérent avec la fiche renforce nettement la crédibilité de l'entreprise aux yeux de Google et des clients." },
      { q: "Les avis clients influencent-ils vraiment le classement ?", a: "Oui. Le nombre, la fraîcheur et la régularité des avis comptent parmi les signaux les plus influents du classement local, en plus de leur effet direct sur la décision du client." },
    ],
  },
  {
    slug: "site-internet-artisan-commercant",
    title: "Site internet pour artisan et commerçant — Wyngo Toulouse",
    h1: "Site internet pour artisan et commerçant",
    desc: "Un site conçu pour un métier manuel ne se construit pas comme une vitrine d'entreprise. Immersion sur le terrain, photos réelles, référencement local. Wyngo, Toulouse.",
    reponse:
      "Pour un artisan ou un commerçant, un site internet efficace repose sur trois choses : des photos réelles du travail accompli, des textes qui parlent le langage des clients plutôt que le jargon du métier, et un référencement ancré dans la ville où l'activité s'exerce. Wyngo produit ces éléments sur place, lors d'une journée d'immersion dans l'entreprise.",
    sections: [
      { h: "Votre travail se montre, il ne se décrit pas", p: [
        "Un artisan se juge sur ce qu'il produit. Aucune description, aussi bien écrite soit-elle, ne remplace la photo d'un chantier terminé, d'une vitrine soignée, d'une pièce fabriquée. C'est pour cette raison que les photos sont produites sur place, chez vous, et non achetées.",
      ]},
      { h: "Parler comme vos clients, pas comme votre métier", p: [
        "Vos clients ne cherchent pas les termes techniques de votre profession : ils décrivent leur problème avec leurs mots. Un site qui reprend ces mots-là est trouvé ; un site rédigé en jargon reste invisible.",
      ]},
      { h: "Chaque métier a ses codes", p: [
        "Une boulangerie a besoin de donner faim en trois secondes. Un plombier doit rassurer et être joignable immédiatement. Un cabinet d'avocats doit inspirer confiance et autorité. Le même modèle de site ne peut pas servir ces trois intentions.",
      ]},
    ],
    faq: [
      { q: "Faut-il un site quand on a déjà une fiche Google ?", a: "La fiche Google fait connaître votre existence ; le site convainc. L'une amène le visiteur, l'autre transforme sa visite en prise de contact. Les deux se renforcent mutuellement." },
      { q: "Qui écrit les textes de mon site ?", a: "Wyngo les rédige, à partir d'une journée d'immersion dans votre entreprise. Vous n'avez pas de contenu à fournir ni de formulaire à remplir." },
      { q: "Et si je ne suis pas à l'aise avec l'informatique ?", a: "C'est précisément le principe : le cabinet vient chez vous et prend le travail en charge de bout en bout. Vous validez, vous ne produisez pas." },
    ],
  },
  {
    slug: "refonte-site-internet-toulouse",
    title: "Refonte de site internet à Toulouse — Wyngo",
    h1: "Quand faut-il refaire son site internet ?",
    desc: "Les signaux qui indiquent qu'un site coûte plus qu'il ne rapporte : illisible sur mobile, invisible sur Google, lent, sans données structurées. Diagnostic et refonte à Toulouse.",
    reponse:
      "Un site doit être refait lorsqu'il ne remplit plus sa fonction : s'il s'affiche mal sur téléphone, s'il n'apparaît pas sur les recherches de votre métier dans votre ville, s'il met plusieurs secondes à charger, ou s'il ne contient aucune donnée structurée permettant à Google et aux moteurs de réponse par IA de le comprendre. Ces quatre défauts se vérifient objectivement, sans jugement esthétique.",
    sections: [
      { h: "Les signaux qui ne trompent pas", p: [
        "L'apparence d'un site est subjective ; son efficacité ne l'est pas. Quatre défauts se mesurent :",
      ], ul: [
        "<strong>Il est cassé sur mobile</strong> — or l'essentiel des recherches locales se fait au téléphone.",
        "<strong>Il est lent</strong> — au-delà de quelques secondes, une grande partie des visiteurs ferment la page avant de l'avoir vue.",
        "<strong>Il est invisible</strong> — votre métier + votre ville ne le fait pas remonter.",
        "<strong>Il n'a pas de données structurées</strong> — sans elles, l'entreprise est quasi invisible pour les aperçus IA de Google.",
      ]},
      { h: "Refondre, ce n'est pas redécorer", p: [
        "Changer les couleurs d'un site qui ne convertit pas ne change rien. Une refonte utile reprend le problème à la racine : ce que vos clients cherchent, ce qu'ils doivent comprendre en trois secondes, et l'action qu'on attend d'eux.",
      ]},
      { h: "Ce que vous récupérez", p: [
        "À la livraison, le code source vous est remis. Vous n'êtes captif d'aucun prestataire, et votre site reste le vôtre — c'est notre manière de vous obliger à nous garder pour la qualité, pas par contrainte.",
      ]},
    ],
    faq: [
      { q: "Comment savoir si mon site est bien référencé ?", a: "Cherchez votre métier suivi de votre ville, en navigation privée. Si votre site n'apparaît ni dans les premiers résultats ni sur la carte, le référencement est à reprendre." },
      { q: "Peut-on garder son nom de domaine lors d'une refonte ?", a: "Oui, le nom de domaine se conserve : c'est même recommandé, car il porte l'ancienneté et la notoriété accumulées auprès de Google." },
      { q: "Que deviennent mes anciennes pages ?", a: "Elles doivent être redirigées vers les nouvelles, sans quoi le référencement acquis est perdu. C'est une étape technique incontournable de toute refonte sérieuse." },
    ],
  },
];

const esc = (s) => String(s).replace(/&(?!\w+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const txt = (s) => String(s).replace(/<[^>]+>/g, "");

function render(p, autres) {
  const url = `${SITE}/${p.slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url, url, name: p.title, description: p.desc,
        inLanguage: "fr-FR", datePublished: MAJ, dateModified: MAJ,
        isPartOf: { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: "Wyngo" },
        about: { "@id": `${SITE}/#organization` },
        primaryImageOfPage: { "@type": "ImageObject", url: `${SITE}/favicon.png` },
        speakable: { "@type": "SpeakableSpecification", cssSelector: [".lede", "h1"] },
      },
      {
        "@type": "Organization", "@id": `${SITE}/#organization`,
        name: "Wyngo", alternateName: "Cabinet Wyngo", url: SITE,
        legalName: "Hugo Malet", foundingDate: "2026-05-14",
        telephone: TEL, email: "contact@wyngo.fr",
        identifier: [{ "@type": "PropertyValue", propertyID: "SIREN", value: "105481386" }],
        founder: { "@type": "Person", name: "Hugo Malet" },
        areaServed: { "@type": "GeoCircle",
          geoMidpoint: { "@type": "GeoCoordinates", latitude: 43.6045, longitude: 1.4442 },
          geoRadius: "30000", description: "Toulouse et 30 km alentour" },
        sameAs: ["https://www.linkedin.com/company/wyngofr/", KG],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Wyngo", item: SITE },
          { "@type": "ListItem", position: 2, name: p.h1, item: url },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: p.faq.map((f) => ({
          "@type": "Question", name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  const corps = p.sections.map((s) => `
    <h2>${s.h}</h2>
    ${(s.p || []).map((x) => `<p>${x}</p>`).join("\n    ")}
    ${s.ul ? `<ul>${s.ul.map((li) => `<li>${li}</li>`).join("")}</ul>` : ""}`).join("\n");

  const faqHtml = p.faq.map((f) => `
      <div class="faq"><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></div>`).join("");

  const liens = autres.map((a) => `<a href="/${a.slug}">${esc(a.h1)}</a>`).join("");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.desc)}">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="Wyngo">
<meta property="og:locale" content="fr_FR">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}/og.png">
<link rel="icon" href="/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body>
<nav><div class="wrap">
  <a href="/" style="text-decoration:none;color:inherit"><span class="wm">Wyngo</span><span class="wm-tag">Cabinet de présence digitale</span></a>
  <a href="/#contact">Soumettre une candidature</a>
</div></nav>

<header><div class="wrap">
  <div class="bc"><a href="/">Wyngo</a> › ${esc(p.h1)}</div>
  <h1>${esc(p.h1)}</h1>
  <p class="lede">${esc(p.reponse)}</p>
</div></header>

<main><div class="wrap">
${corps}

  <h2>Questions fréquentes</h2>
  ${faqHtml}

  <div class="card">
    <h3>À lire aussi</h3>
    <div class="rel">${liens}</div>
  </div>

  <div class="cta">
    <h2>Parlons de votre projet</h2>
    <p>Wyngo accompagne 9 entrepreneurs par trimestre, à Toulouse et 30 km alentour.</p>
    <a class="btn" href="/#contact">Soumettre une candidature</a>
  </div>
</div></main>

<footer><div class="wrap">
  <p><strong>Wyngo</strong> — cabinet de présence digitale, Toulouse et 30 km alentour.<br>
  <a href="tel:${TEL}">${TEL_AFF}</a> · <a href="mailto:contact@wyngo.fr">contact@wyngo.fr</a></p>
</div></footer>
</body>
</html>`;
}

// ── Génération ──
for (const p of PAGES) {
  const autres = PAGES.filter((x) => x.slug !== p.slug).slice(0, 4);
  writeFileSync(`${p.slug}.html`, render(p, autres));
  console.log("✓", `${p.slug}.html`);
}

// robots.txt — autorise EXPLICITEMENT les robots des IA (aperçus IA, ChatGPT,
// Claude, Perplexity). Sans mention, l'accès est permis par défaut, mais une
// autorisation explicite lève toute ambiguïté et déclare le sitemap.
writeFileSync("robots.txt", `# wyngo.fr
User-agent: *
Allow: /

# Moteurs de réponse par IA — accès explicitement autorisé
User-agent: Google-Extended
Allow: /
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-Web
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: Bingbot
Allow: /

Sitemap: ${SITE}/sitemap.xml
`);
console.log("✓ robots.txt");

// sitemap.xml
const urls = [{ loc: SITE + "/", prio: "1.0" }, ...PAGES.map((p) => ({ loc: `${SITE}/${p.slug}`, prio: "0.8" }))];
writeFileSync("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${MAJ}</lastmod><priority>${u.prio}</priority></url>`).join("\n")}
</urlset>
`);
console.log("✓ sitemap.xml");

// llms.txt — résumé structuré destiné aux agents IA (standard émergent).
writeFileSync("llms.txt", `# Wyngo

> Cabinet de présence digitale basé à Toulouse. Conçoit des sites internet sur-mesure pour artisans, commerçants, professions libérales et TPE, à Toulouse et dans un rayon de 30 km.

Wyngo se distingue par une méthode d'immersion : une journée passée dans l'entreprise du client, pendant laquelle les textes sont rédigés et les photos produites sur place. Le code source est remis au client à la livraison. Aucun paiement n'est demandé avant validation de la première maquette. Le cabinet accompagne 9 entrepreneurs par trimestre.

- Entité légale : Hugo Malet (enseigne Wyngo), SIREN 105481386, immatriculée le 14 mai 2026
- Téléphone : ${TEL_AFF}
- Email : contact@wyngo.fr
- Zone : Toulouse et 30 km alentour

## Pages
${PAGES.map((p) => `- [${p.h1}](${SITE}/${p.slug}) : ${p.desc}`).join("\n")}

## À propos
- [Site principal](${SITE}/) : présentation du cabinet, méthode, études de cas
- [Le Radar Tech](https://leradartech.fr/article/wyngo-decouverte-2026/) : article de presse consacré à Wyngo
`);
console.log("✓ llms.txt");
console.log(`\n${PAGES.length} pages + robots.txt + sitemap.xml + llms.txt générés.`);
