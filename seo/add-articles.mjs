// ─── Le Radar Tech — ajout de pages statiques (miroir + ajout) ────────────
// Rend les pages des NOUVEAUX articles publiés à partir de la base Supabase,
// en réutilisant le gabarit exact du site (CSS + structure extraits d'une page
// existante), puis injecte leurs cartes dans la home et la rubrique + sitemap.
// N'altère AUCUNE page existante. Usage : node add-articles.mjs slug1 slug2 …

import fs from "node:fs";

const RT = "/Users/hugomalet/le-radar-tech";
const SB = "https://mwkkgubvdswmdaiswepl.supabase.co";
const ANON = process.env.RADAR_ANON;
const SITE = "https://leradartech.fr";
const slugs = process.argv.slice(2);
if (!ANON) { console.error("RADAR_ANON manquante"); process.exit(1); }
if (slugs.length === 0) { console.error("Passe au moins un slug"); process.exit(1); }

const CAT = { tech: "Tech", outils: "Outils", ia: "Intelligence artificielle", medias: "Médias", internet: "Internet", enquetes: "Enquêtes" };
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const amp = (s) => String(s || "").replace(/&(?![a-z]+;)/g, "&amp;"); // pour les URLs dans le HTML
const frDate = (iso) => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso));
function descOf(sf) { const s = String(sf || "").trim(); if (s.length <= 158) return s; const cut = s.slice(0, 155); return cut.slice(0, cut.lastIndexOf(" ")) + "…"; }

// ── Gabarit : on extrait les morceaux CONSTANTS d'une page article existante ──
const tplPath = `${RT}/article/cal-com-agenda-open-source/index.html`;
const tpl = fs.readFileSync(tplPath, "utf8");
const CSS = tpl.match(/<style>([\s\S]*?)<\/style>/)[1];
// util + mast : entre <div id="app"> et <article class="art">
const utilMast = tpl.match(/<div id="app">([\s\S]*?)<article class="art">/)[1];
// newsletter + footer : de <section class="news" à </footer>
const newsFooter = tpl.match(/(<section class="news"[\s\S]*?<\/footer>)/)[1];

async function fetchArticle(slug) {
  const r = await fetch(`${SB}/rest/v1/radar_articles?slug=eq.${slug}&select=slug,title,kicker,category,standfirst,body,cover_url,author,published_at,status`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  const d = await r.json();
  return d[0] || null;
}
async function fetchAllPublished() {
  const r = await fetch(`${SB}/rest/v1/radar_articles?status=eq.publie&select=slug,title,kicker,category,standfirst,cover_url,author,published_at&order=published_at.desc`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  return await r.json();
}

function faqLd(body) {
  const pairs = [...body.matchAll(/<h3 class="faq-q">([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)];
  if (pairs.length === 0) return null;
  const strip = (h) => h.replace(/<[^>]+>/g, "").trim();
  return JSON.stringify({
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: pairs.map(([, q, a]) => ({ "@type": "Question", name: strip(q), acceptedAnswer: { "@type": "Answer", text: strip(a) } })),
  });
}

function relatedHtml(art, all) {
  const others = all.filter((a) => a.slug !== art.slug);
  const same = others.filter((a) => a.category === art.category);
  const pick = [...same, ...others.filter((a) => a.category !== art.category)].slice(0, 4);
  const items = pick.map((a) =>
    `<a href="/article/${a.slug}/" style="display:block;padding:11px 0;border-bottom:1px solid var(--line)"><span class="kick" style="font-size:10px">${CAT[a.category] || a.category}</span><div class="serif" style="font-size:16px;line-height:1.25;margin-top:3px;color:var(--ink)">${esc(a.title)}</div></a>`
  ).join("");
  return `<aside style="max-width:720px;margin:10px auto 0;padding:0 24px"><div class="lbl" style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:8px">À lire aussi</div>${items}</aside>`;
}

function renderArticle(a, all) {
  const desc = descOf(a.standfirst);
  const cover = amp(a.cover_url);
  const catLabel = CAT[a.category] || a.category;
  const news = {
    "@context": "https://schema.org", "@type": "NewsArticle",
    headline: a.title, description: desc, image: [a.cover_url],
    datePublished: a.published_at, dateModified: a.published_at,
    author: { "@type": "Organization", name: a.author || "La rédaction" },
    publisher: { "@type": "Organization", name: "Le Radar Tech", url: SITE, logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png`, width: 512, height: 512 } },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/article/${a.slug}/` },
    articleSection: catLabel, inLanguage: "fr",
    speakable: { "@type": "SpeakableSpecification", cssSelector: [".art h1", ".art .sf"] },
  };
  const bc = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: catLabel, item: `${SITE}/rubrique/${a.category}/` },
      { "@type": "ListItem", position: 3, name: a.title, item: `${SITE}/article/${a.slug}/` },
    ],
  };
  const faq = faqLd(a.body);
  return `<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(a.title)} — Le Radar Tech</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/article/${a.slug}/">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta property="og:type" content="article"><meta property="og:site_name" content="Le Radar Tech">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(a.title)} — Le Radar Tech"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}/article/${a.slug}/"><meta property="og:image" content="${cover}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(a.title)} — Le Radar Tech"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${cover}">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png"><link rel="icon" href="/favicon-16.png" sizes="16x16" type="image/png"><link rel="icon" href="/icon-512.png" type="image/png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Libre+Franklin:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(news)}</script>
<script type="application/ld+json">${JSON.stringify(bc)}</script>${faq ? `\n<script type="application/ld+json">${faq}</script>` : ""}
</head>
<body>
<script>window.__SLUG__="${a.slug}";</script>
<div id="app">${utilMast}<article class="art"><a class="backlink" href="/">← À la une</a><div style="margin-top:14px"><span class="kick">${esc(a.kicker || catLabel)}</span></div><h1 class="serif">${esc(a.title)}</h1><p class="sf">${esc(a.standfirst)}</p><div class="meta">Par ${esc(a.author || "La rédaction")} · ${frDate(a.published_at)}</div><img class="cover" src="${cover}" alt="${esc(a.title)}"><div class="content">${a.body}</div><div style="margin-top:40px;padding-top:20px;border-top:1px solid var(--line)"><a class="backlink" href="/">← Tous les articles</a></div></article>${relatedHtml(a, all)}${newsFooter}</div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script src="/app.js"></script>
</body></html>`;
}

function cardHtml(a) {
  return `<article class="card"><a class="img" href="/article/${a.slug}/"><img src="${amp(a.cover_url)}" alt="${esc(a.title)}" loading="lazy"></a><span class="kick">${esc(a.kicker || CAT[a.category] || a.category)}</span><h2 class="serif"><a href="/article/${a.slug}/">${esc(a.title)}</a></h2><p>${esc(a.standfirst)}</p><span class="by">Par ${esc(a.author || "La rédaction")}</span></article>`;
}

function injectCard(file, card) {
  let h = fs.readFileSync(file, "utf8");
  if (h.includes(`/article/`) && h.includes(card.match(/href="(\/article\/[^"]+)"/)[1])) return; // déjà présent
  h = h.replace('<section class="grid">', `<section class="grid">${card}`);
  fs.writeFileSync(file, h);
}

// ── Exécution ──
const all = await fetchAllPublished();
for (const slug of slugs) {
  const a = await fetchArticle(slug);
  if (!a) { console.error("introuvable:", slug); continue; }
  if (a.status !== "publie") { console.error("pas publié:", slug); continue; }
  fs.mkdirSync(`${RT}/article/${slug}`, { recursive: true });
  fs.writeFileSync(`${RT}/article/${slug}/index.html`, renderArticle(a, all));
  const card = cardHtml(a);
  injectCard(`${RT}/index.html`, card);
  const rub = `${RT}/rubrique/${a.category}/index.html`;
  if (fs.existsSync(rub)) injectCard(rub, card);
  console.log("✓ rendu + injecté:", slug, "→ /article/" + slug + "/ (rubrique " + a.category + ")");
}

// ── Sitemap : ajoute les nouvelles URLs si absentes ──
let sm = fs.readFileSync(`${RT}/sitemap.xml`, "utf8");
for (const slug of slugs) {
  const loc = `${SITE}/article/${slug}/`;
  if (!sm.includes(loc)) {
    sm = sm.replace("</urlset>", `<url><loc>${loc}</loc></url>\n</urlset>`);
  }
}
fs.writeFileSync(`${RT}/sitemap.xml`, sm);
console.log("✓ sitemap mis à jour");
