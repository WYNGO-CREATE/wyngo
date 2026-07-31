/**
 * ─── Rendu d'une présentation de vente (deck HTML) ────────────────────
 * Plein écran navigable (flèches/clic) + imprimable PDF (1 diapo = 1 page).
 *
 * Direction visuelle « clair structuré » : fond blanc, bandeau latéral crème
 * qui garde le nom du prospect sous ses yeux du début à la fin, blocs nets.
 * Palette Wyngo : crème #F7F4EC, encre #141410, cobalt #1B4BE3.
 */

export type PitchBullet = { text: string; figure?: string | null; source?: string | null };
export type PitchQA = { q: string; r: string };
export type PitchOption = { id: string; label: string; prix: number; quoi: string };
export type PitchPanier = { base_min: number; base_max: number; options: PitchOption[]; base_inclus?: string[]; variation?: string[] };
export type PitchSlide = { kind: string; title: string; subtitle?: string | null; bullets: PitchBullet[]; questions?: PitchQA[]; panier?: PitchPanier };
export type PitchDeck = { headline: string; slides: PitchSlide[]; preview_slug?: string | null };
export type PitchMeta = { clientName: string; sector?: string | null; city?: string | null; origin?: string | null };

/** Sites réellement livrés — montrés et cliquables pendant la visio. */
const REALISATIONS = [
  { nom: "Archimaides", url: "https://www.archimaides.com", quoi: "Architecte d'intérieur, Toulouse", img: "archimaides" },
  { nom: "Don Demeure", url: "https://don-demeure.vercel.app", quoi: "Patrimoine & immobilier", img: "don-demeure" },
  { nom: "Mission Magis", url: "https://missionmagis.com", quoi: "Lavage automobile à domicile", img: "mission-magis" },
  { nom: "Artefact Neural", url: "https://artefactneural.com", quoi: "Studio technologique", img: "artefact-neural" },
];

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

const TAGS: Record<string, string> = {
  recap: "Ce qu'on s'est dit", constat: "Le constat", marche: "Le marché",
  site: "Ce qu'on construit", methode: "La méthode", inclus: "Ce qui est compris",
  realisations: "Nos réalisations", technique: "Notre savoir-faire",
  panier: "Votre investissement", prix: "Votre investissement", offre: "Notre proposition",
};

function statBlocks(bullets: PitchBullet[]): string {
  // Un seul chiffre → bloc large et lisible ; plusieurs → une rangée de cartes.
  const wide = bullets.length === 1;
  return `<div class="stats ${wide ? "one" : ""}">${bullets.map((b) => `<div class="stat">
    <div class="fig">${esc(b.figure)}</div>
    <div class="txt">${esc(b.text)}${b.source ? `<div class="src">Source — ${esc(b.source)}</div>` : ""}</div>
  </div>`).join("")}</div>`;
}

function pointList(bullets: PitchBullet[]): string {
  return `<ul class="pts">${bullets.map((b) => `<li><span class="dot"></span><span class="li-txt">${esc(b.text)}${b.source ? `<span class="src-inline"> — ${esc(b.source)}</span>` : ""}</span></li>`).join("")}</ul>`;
}

const eur = (n: number) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0")}\u00A0€`;

function panierHtml(p: PitchPanier): string {
  return `<div class="panier">
    <div class="base">
      <div class="base-l">Le site</div>
      <div class="base-p">${eur(p.base_min)} <span>à</span> ${eur(p.base_max)}</div>
    </div>
    ${(p.base_inclus?.length || p.variation?.length) ? `<div class="cols">
      ${p.base_inclus?.length ? `<div class="col"><div class="col-h">Compris dès ${eur(p.base_min)}</div>
        <ul>${p.base_inclus.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
      ${p.variation?.length ? `<div class="col alt"><div class="col-h">Ce qui fait monter vers ${eur(p.base_max)}</div>
        <ul>${p.variation.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
    </div>` : ""}
    <div class="opt-h">Les options — vous composez</div>
    <div class="opts">${p.options.map((o) => `<label class="opt">
      <input type="checkbox" class="ck" data-prix="${o.prix}">
      <span class="box"></span>
      <span class="o-txt"><span class="o-l">${esc(o.label)}</span><span class="o-q">${esc(o.quoi)}</span></span>
      <span class="o-p">+ ${eur(o.prix)}</span>
    </label>`).join("")}</div>
    <div class="tot"><span class="tot-l">Total</span>
      <span class="tot-p"><span id="tmin" data-base="${p.base_min}">${eur(p.base_min)}</span> <span class="sep">à</span> <span id="tmax" data-base="${p.base_max}">${eur(p.base_max)}</span></span></div>
  </div>`;
}

function realisationsHtml(origin: string): string {
  return `<div class="reals">${REALISATIONS.map((r) => `<a class="real" href="${esc(r.url)}" target="_blank" rel="noopener">
    <span class="r-shot"><img src="${esc(origin)}/realisations/${r.img}.jpg" alt="${esc(r.nom)}"></span>
    <span class="r-meta"><span class="r-n">${esc(r.nom)}</span><span class="r-q">${esc(r.quoi)}</span></span>
  </a>`).join("")}</div>`;
}

function slideHtml(s: PitchSlide, meta: PitchMeta, idx: number, total: number): string {
  const all = s.bullets || [];
  const tag = TAGS[s.kind] || "";

  // La diapo prix ouvre sur un bandeau encre : le montant doit être assumé,
  // pas noyé dans une liste.
  let priceBox = "";
  let rest = all;
  if (s.kind === "prix") {
    const i = all.findIndex((b) => b.figure);
    if (i >= 0) {
      priceBox = `<div class="pricebox"><div class="amt">${esc(all[i].figure)}</div><div class="lbl">${esc(all[i].text)}</div></div>`;
      rest = all.filter((_, j) => j !== i);
    }
  }
  const stats = rest.filter((b) => b.figure);
  const plain = rest.filter((b) => !b.figure);

  const body = s.kind === "panier" && s.panier
    ? `${plain.length ? pointList(plain) : ""}${panierHtml(s.panier)}`
    : s.kind === "realisations"
      ? `${plain.length ? pointList(plain) : ""}${realisationsHtml(meta.origin || "")}`
      : `${priceBox}${stats.length ? statBlocks(stats) : ""}${plain.length ? pointList(plain) : ""}`;

  return `<section class="slide ${s.kind === "panier" || s.kind === "realisations" ? "wide" : ""}">
    <aside class="side">
      <div class="brand">Wyngo</div>
      ${tag ? `<div class="tag">${tag}</div>` : ""}
      <div class="who"><b>${esc(meta.clientName)}</b>${meta.city ? `${esc(meta.city)}<br>` : ""}${meta.sector ? esc(meta.sector) : ""}</div>
    </aside>
    <div class="main">
      <div class="fit">
        <h2>${esc(s.title)}</h2>${s.subtitle ? `<p class="sub">${esc(s.subtitle)}</p>` : ""}
        <div class="body">${body}</div>
      </div>
      <div class="pg">${idx} / ${total}</div>
    </div>
  </section>`;
}

export function renderPitchHtml(deck: PitchDeck, meta: PitchMeta): string {
  // La fiche « questions » est stockée avec les diapos mais reste PRIVÉE :
  // on l'exclut du rendu, sinon elle s'afficherait au prospect en partage d'écran.
  const slides = (Array.isArray(deck.slides) ? deck.slides : []).filter((s) => s.kind !== "faq");
  const total = slides.length + 1;
  const rx = meta.clientName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headline = String(deck.headline || meta.clientName).replace(new RegExp(`^\\s*${rx}\\s*[—–-]\\s*`, "i"), "").trim() || meta.clientName;
  const cover = `<section class="slide cover">
    <aside class="side">
      <div class="brand">Wyngo</div>
      <div class="who"><b>${esc(meta.clientName)}</b>${meta.city ? `${esc(meta.city)}<br>` : ""}${meta.sector ? esc(meta.sector) : ""}</div>
    </aside>
    <div class="main">
      <div class="fit">
        <div class="c-kicker">Présentation préparée pour</div>
        <div class="c-client">${esc(meta.clientName)}</div>
        <h1>${esc(headline)}</h1>
      </div>
      <div class="pg">1 / ${total}</div>
    </div>
  </section>`;
  const content = slides.map((s, i) => slideHtml(s, meta, i + 2, total)).join("");

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Présentation — ${esc(meta.clientName)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  :root{--co:#1B4BE3;--co2:#4C7DF0;--cream:#F7F4EC;--ink:#141410;--muted:#57534a;--line:#e7e0ce}
  html,body{height:100%}
  body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#22221e;color:var(--ink);-webkit-font-smoothing:antialiased}
  .bar2{position:fixed;top:0;left:0;right:0;height:46px;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 16px;z-index:50;font-size:12.5px}
  .bar2 b{font-weight:700}
  .bar2 .grp button{background:#fff;color:var(--ink);border:0;padding:7px 13px;border-radius:8px;font-weight:700;cursor:pointer;margin-left:8px;font-size:12.5px}
  .stage{position:fixed;inset:46px 0 52px 0;display:flex;align-items:center;justify-content:center;padding:2.2vmin}
  .slide{display:none;width:100%;height:100%;max-width:1240px;background:#fff;border-radius:18px;overflow:hidden;
    box-shadow:0 24px 70px rgba(0,0,0,.45);position:relative;flex-direction:row}
  .slide.active{display:flex}

  /* ── Bandeau latéral : le prospect reste sous ses yeux en permanence ── */
  .side{width:clamp(160px,19vmin,250px);flex:none;background:var(--cream);border-right:1px solid var(--line);
    padding:clamp(24px,4.4vmin,56px) clamp(16px,2.5vmin,32px);display:flex;flex-direction:column}
  .brand{font-size:clamp(12px,1.5vmin,14px);font-weight:800;color:var(--co);letter-spacing:.03em}
  .tag{font-size:clamp(10px,1.25vmin,12.5px);letter-spacing:.16em;text-transform:uppercase;color:#8a8577;
    font-weight:700;margin-top:clamp(9px,1.4vmin,15px);line-height:1.5}
  .who{margin-top:auto;font-size:clamp(11px,1.3vmin,12.5px);color:var(--muted);line-height:1.6}
  .who b{display:block;color:var(--ink);font-size:clamp(13px,1.6vmin,15px);margin-bottom:2px}

  /* ── Zone principale ── */
  .main{flex:1;min-width:0;padding:clamp(26px,4.8vmin,60px) clamp(26px,5.2vmin,66px) clamp(34px,5vmin,58px);
    display:flex;flex-direction:column;justify-content:safe center;overflow:auto}
  .main>*{flex:none}
  .fit{min-width:0}
  h1{font-size:clamp(28px,5vmin,54px);line-height:1.08;letter-spacing:-1.4px;font-weight:800;max-width:19ch}
  h2{font-size:clamp(23px,3.8vmin,46px);line-height:1.12;letter-spacing:-1.1px;font-weight:800;max-width:20ch}
  .sub{font-size:clamp(14px,1.85vmin,18.5px);line-height:1.55;color:var(--muted);margin-top:clamp(9px,1.4vmin,18px);max-width:54ch}
  .body{margin-top:clamp(14px,2.6vmin,32px)}
  .pg{position:absolute;right:clamp(18px,2.6vmin,30px);bottom:clamp(14px,2vmin,24px);
    font-size:clamp(10px,1.15vmin,12px);color:#b3ada0;font-variant-numeric:tabular-nums}

  /* ── Chiffres ── */
  .stats{display:flex;gap:clamp(10px,1.5vmin,18px);flex-wrap:wrap}
  .stat{flex:1;min-width:190px;display:flex;gap:clamp(12px,1.8vmin,22px);align-items:flex-start;
    background:linear-gradient(135deg,#eef2fe,#fff);border:1px solid #d5deff;border-radius:16px;
    padding:clamp(15px,2.2vmin,26px) clamp(16px,2.4vmin,30px)}
  .stats.one .stat{align-items:center}
  .stats:not(.one) .stat{flex-direction:column;gap:clamp(8px,1.1vmin,13px)}
  .fig{font-size:clamp(30px,4.6vmin,58px);font-weight:800;color:var(--co);letter-spacing:-2px;line-height:1;
    white-space:nowrap;flex:none}
  .stat .txt{font-size:clamp(13px,1.65vmin,16.5px);line-height:1.5;color:#2a2721}
  .src,.src-inline{font-size:clamp(10px,1.15vmin,12px);color:#9a948a}
  .src{margin-top:7px}

  /* ── Listes ── */
  ul.pts{list-style:none;display:flex;flex-direction:column;gap:clamp(9px,1.5vmin,17px);margin-top:clamp(0px,1.6vmin,22px)}
  ul.pts li{display:flex;gap:clamp(10px,1.3vmin,15px);align-items:flex-start}
  ul.pts .dot{flex:none;width:8px;height:8px;border-radius:3px;background:var(--co);margin-top:.55em}
  ul.pts .li-txt{font-size:clamp(14px,1.85vmin,18.5px);line-height:1.5;color:#2a2721;min-width:0}
  ul.pts .li-txt b{font-weight:700;color:var(--ink)}

  /* ── Prix ── */
  .pricebox{display:flex;align-items:center;gap:clamp(16px,2.6vmin,30px);background:var(--ink);color:#fff;
    border-radius:16px;padding:clamp(18px,2.6vmin,30px) clamp(22px,3.2vmin,38px);flex-wrap:wrap}
  .pricebox .amt{font-size:clamp(32px,4.6vmin,56px);font-weight:800;letter-spacing:-2px;line-height:1;white-space:nowrap}
  .pricebox .lbl{font-size:clamp(13px,1.7vmin,16.5px);line-height:1.45;color:#bdb8ac;min-width:0}

    background:#fff;display:flex;flex-direction:column;min-height:clamp(190px,30vmin,320px)}

  /* ── Panier : le prospect coche en direct, le total se recalcule ── */
  .slide.wide .main{padding-top:clamp(20px,3.4vmin,40px);padding-bottom:clamp(28px,3.6vmin,44px)}
  .panier{margin-top:clamp(12px,1.8vmin,22px);border:1px solid var(--line);border-radius:16px;overflow:hidden}
  .base{display:flex;align-items:baseline;justify-content:space-between;gap:16px;background:var(--cream);
    padding:clamp(12px,1.7vmin,20px) clamp(14px,2.2vmin,26px);border-bottom:1px solid var(--line)}
  .base-l{font-size:clamp(13px,1.65vmin,17px);font-weight:700}
  .base-p{font-size:clamp(19px,2.5vmin,29px);font-weight:800;letter-spacing:-1px;white-space:nowrap}
  .base-p span{font-size:.6em;font-weight:600;color:var(--muted);margin:0 2px}
  .opts{display:grid;grid-template-columns:1fr 1fr;gap:0}
  .opt{display:flex;align-items:flex-start;gap:clamp(8px,1.1vmin,12px);cursor:pointer;
    padding:clamp(8px,1.15vmin,13px) clamp(12px,1.7vmin,20px);border-bottom:1px solid #f0ece0;
    transition:background .12s}
  .opt:nth-child(odd){border-right:1px solid #f0ece0}
  .opt:hover{background:#fafbff}
  .opt .ck{position:absolute;opacity:0;width:0;height:0}
  .opt .box{flex:none;width:clamp(15px,1.7vmin,18px);height:clamp(15px,1.7vmin,18px);margin-top:.15em;
    border:1.5px solid #c9c2ae;border-radius:5px;background:#fff;position:relative}
  .opt .box::after{content:"";position:absolute;left:32%;top:12%;width:26%;height:52%;
    border:solid #fff;border-width:0 2px 2px 0;transform:rotate(42deg);opacity:0}
  .opt .ck:checked~.box{background:var(--co);border-color:var(--co)}
  .opt .ck:checked~.box::after{opacity:1}
  .opt .ck:focus-visible~.box{box-shadow:0 0 0 3px rgba(27,75,227,.3)}
  .o-txt{flex:1;min-width:0;display:flex;flex-direction:column}
  .o-l{font-size:clamp(12px,1.5vmin,15px);font-weight:600;line-height:1.3}
  .o-q{font-size:clamp(10.5px,1.25vmin,12.5px);line-height:1.4;color:var(--muted);margin-top:2px}
  .o-p{flex:none;font-size:clamp(11.5px,1.4vmin,14px);font-weight:700;color:var(--co);white-space:nowrap;margin-top:.1em}
  .opt .ck:checked~.o-p{color:var(--co)}
  .tot{display:flex;align-items:center;justify-content:space-between;gap:16px;background:var(--ink);color:#fff;
    padding:clamp(12px,1.7vmin,20px) clamp(14px,2.2vmin,26px)}
  .tot-l{font-size:clamp(12px,1.5vmin,15px);font-weight:600;color:#bdb8ac;letter-spacing:.04em;text-transform:uppercase}
  .tot-p{font-size:clamp(21px,2.8vmin,33px);font-weight:800;letter-spacing:-1.2px;white-space:nowrap;font-variant-numeric:tabular-nums}
  .tot-p .sep{font-size:.55em;font-weight:600;color:#bdb8ac;margin:0 3px}

  /* ── Réalisations : cliquables, on peut ouvrir le site en direct ── */
  .reals{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(10px,1.5vmin,18px);margin-top:clamp(12px,2vmin,24px)}
  .real{display:flex;flex-direction:column;text-decoration:none;color:inherit;border:1px solid var(--line);
    border-radius:13px;overflow:hidden;background:#fff;transition:box-shadow .15s,transform .15s}
  .real:hover{box-shadow:0 10px 26px rgba(20,20,16,.16);transform:translateY(-2px)}
  .r-shot{display:block;aspect-ratio:16/9;background:var(--cream);overflow:hidden}
  .r-shot img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block}
  .r-meta{padding:clamp(8px,1.15vmin,13px) clamp(9px,1.3vmin,15px);display:flex;flex-direction:column;gap:2px;
    border-top:1px solid var(--line)}
  .r-n{font-size:clamp(12px,1.5vmin,15px);font-weight:700}
  .r-q{font-size:clamp(10.5px,1.25vmin,12.5px);color:var(--muted);line-height:1.35}

  /* ── Panier : détail de la tranche ── */
  .cols{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--line)}
  .col{padding:clamp(10px,1.5vmin,18px) clamp(13px,1.9vmin,22px)}
  .col.alt{border-left:1px solid var(--line);background:#fcfbf7}
  .col-h{font-size:clamp(10px,1.2vmin,12px);letter-spacing:.13em;text-transform:uppercase;font-weight:700;
    color:#8a8577;margin-bottom:clamp(6px,.9vmin,10px)}
  .col ul{list-style:none;display:flex;flex-direction:column;gap:clamp(3px,.5vmin,6px)}
  .col li{font-size:clamp(10.5px,1.3vmin,13.5px);line-height:1.4;color:#2a2721;padding-left:13px;position:relative}
  .col li::before{content:"";position:absolute;left:0;top:.5em;width:5px;height:5px;border-radius:2px;background:var(--co)}
  .col.alt li::before{background:#c9c2ae}
  .opt-h{font-size:clamp(10px,1.2vmin,12px);letter-spacing:.13em;text-transform:uppercase;font-weight:700;
    color:#8a8577;padding:clamp(9px,1.3vmin,15px) clamp(13px,1.9vmin,22px) clamp(4px,.6vmin,7px)}

  /* ── Couverture ── */
  .cover .main{justify-content:center;background:var(--cream)}
  .c-kicker{font-size:clamp(11px,1.35vmin,13px);letter-spacing:.18em;text-transform:uppercase;color:#8a8577;font-weight:700}
  .c-client{font-size:clamp(17px,2.3vmin,24px);font-weight:800;margin:clamp(5px,.8vmin,9px) 0 clamp(16px,2.6vmin,30px)}
  .cover .side{background:var(--ink);border-right:0}
  .cover .brand{color:#fff}
  .cover .who{color:#9d988c}
  .cover .who b{color:#fff}
  .cover h1::after{content:"";display:block;width:clamp(40px,6vmin,72px);height:3px;background:var(--co);margin-top:clamp(18px,2.6vmin,30px)}

  .nav{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:14px;background:var(--ink);color:#fff;padding:8px 16px;border-radius:999px;z-index:50}
  .nav button{background:none;border:0;color:#fff;font-size:22px;cursor:pointer;line-height:1}
  .nav .count{font-size:13px;font-variant-numeric:tabular-nums;min-width:56px;text-align:center}
  .fsExit{display:none;position:fixed;top:12px;right:14px;z-index:60;background:rgba(20,20,16,.9);color:#fff;border:0;padding:9px 16px;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer}
  body.fs .bar2{display:none}
  body.fs .stage{inset:0}
  body.fs .fsExit{display:block}

  @media screen and (max-width:760px){
    .bar2{height:44px;font-size:12px;padding:0 10px}
    .bar2>span:first-child{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .bar2 .grp{flex:none;white-space:nowrap;display:flex}
    .bar2 .grp button{padding:6px 9px;font-size:11px;margin-left:6px}
    .stage{position:fixed;inset:44px 0 58px 0;padding:10px;display:block;overflow-y:auto;-webkit-overflow-scrolling:touch}
    .slide{display:none;width:100%;height:auto;max-width:none;border-radius:14px;flex-direction:column}
    .slide.active{display:flex}
    /* Le bandeau latéral devient un en-tête horizontal */
    .side{width:auto;flex-direction:row;align-items:baseline;gap:12px;padding:14px 18px;
      border-right:0;border-bottom:1px solid var(--line)}
    .tag{margin-top:0}
    .who{margin-top:0;margin-left:auto;text-align:right;font-size:11px}
    .who b{display:inline;font-size:12.5px}
    .who br{display:none}
    .main{padding:22px 20px 40px;overflow:visible}
    h1{font-size:27px;letter-spacing:-.6px;line-height:1.2}
    h2{font-size:22px;letter-spacing:-.4px;line-height:1.26}
    .sub{font-size:15px;margin-top:10px;max-width:none}
    .body{margin-top:18px}
    .stats{display:block}
    .stat{display:flex;margin-bottom:12px;min-width:0;padding:15px 16px}
    .stat:last-child{margin-bottom:0}
    .fig{font-size:32px}
    .stat .txt{font-size:14.5px}
    ul.pts{gap:14px;margin-top:16px}
    ul.pts .li-txt{font-size:15.5px}
    .pricebox{padding:18px 20px;gap:14px}
    .pricebox .amt{font-size:34px}
    .reals{grid-template-columns:1fr 1fr;gap:10px}
    .cols{grid-template-columns:1fr}
    .col.alt{border-left:0;border-top:1px solid var(--line)}
    .opts{grid-template-columns:1fr}
    .opt:nth-child(odd){border-right:0}
    .cover .main{justify-content:flex-start;min-height:52vh}
    .pg{position:static;margin-top:22px;text-align:right}
  }

  @media print{
    @page{size:A4 landscape;margin:0}
    body{background:#fff}
    .bar2,.nav,.fsExit{display:none}
    .stage{position:static;inset:auto;padding:0;display:block}
    .slide{display:flex!important;flex-direction:row;width:100%;height:100vh;max-width:none;border-radius:0;
      box-shadow:none;page-break-after:always;break-after:page;overflow:hidden}
    .slide:last-child{page-break-after:auto;break-after:auto}
    .main{overflow:hidden}
    .side,.cover .side,.cover .main,.stat,.pricebox,.base,.col.alt,.tot,.opt .ck:checked~.box{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .slide.wide .fit{zoom:.78}
    .opt{padding-top:6px;padding-bottom:6px}
    .real:hover{box-shadow:none;transform:none}
  }
</style></head>
<body>
  <div class="bar2">
    <span>Présentation · <b>${esc(meta.clientName)}</b></span>
    <span class="grp"><button id="fsBtn" onclick="fs()">Plein écran</button><button onclick="window.print()">Imprimer / PDF</button></span>
  </div>
  <button id="fsExit" class="fsExit" onclick="fs()">✕ Quitter le plein écran</button>
  <div class="stage" id="stage">${cover}${content}</div>
  <div class="nav"><button onclick="go(-1)" aria-label="Précédent">‹</button><span class="count" id="count"></span><button onclick="go(1)" aria-label="Suivant">›</button></div>
<script>
  // Le contenu vient de l'IA : sa longueur varie d'un prospect à l'autre.
  // On réduit l'échelle de la diapo jusqu'à ce qu'elle tienne, plutôt que de
  // la laisser se couper à l'écran ou à l'impression.
  function fitAll(){
    [].forEach.call(document.querySelectorAll('.slide'),function(sl){
      var m=sl.querySelector('.main'),f=sl.querySelector('.fit');
      if(!m||!f) return;
      f.style.zoom='';
      if(m.clientHeight<40) return;               // diapo masquée : rien à mesurer
      var k=1;
      while(m.scrollHeight>m.clientHeight+1 && k>0.6){ k-=0.04; f.style.zoom=k; }
    });
  }
  // Panier : le total se recalcule à chaque case cochée, sous les yeux du prospect.
  (function(){
    var min=document.getElementById('tmin'), max=document.getElementById('tmax');
    if(!min||!max) return;
    var b0=parseInt(min.getAttribute('data-base'),10), b1=parseInt(max.getAttribute('data-base'),10);
    var f=function(n){return String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g,'\u00A0')+'\u00A0\u20AC';};
    document.addEventListener('change',function(e){
      if(!e.target.classList||!e.target.classList.contains('ck')) return;
      var sum=0;
      [].forEach.call(document.querySelectorAll('.ck'),function(c){ if(c.checked) sum+=parseInt(c.getAttribute('data-prix'),10)||0; });
      min.textContent=f(b0+sum); max.textContent=f(b1+sum);
      fitAll();
    });
  })();
  var slides=[].slice.call(document.querySelectorAll('.slide')),cur=0;
  function show(i){cur=Math.max(0,Math.min(slides.length-1,i));slides.forEach(function(s,j){s.classList.toggle('active',j===cur)});document.getElementById('count').textContent=(cur+1)+' / '+slides.length;fitAll();}
  function go(d){show(cur+d);}
  function fs(){if(document.fullscreenElement){document.exitFullscreen();}else{(document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen).call(document.documentElement);}}
  document.addEventListener('fullscreenchange',function(){var on=!!document.fullscreenElement;document.body.classList.toggle('fs',on);var b=document.getElementById('fsBtn');if(b)b.textContent=on?'Quitter':'Plein écran';});
  document.addEventListener('keydown',function(e){if(['ArrowRight',' ','PageDown'].includes(e.key)){go(1);e.preventDefault();}else if(['ArrowLeft','PageUp'].includes(e.key)){go(-1);e.preventDefault();}});
  show(0);
  window.addEventListener('resize',fitAll);
  window.addEventListener('beforeprint',function(){document.body.classList.add('printing');fitAll();});
  window.addEventListener('afterprint',function(){document.body.classList.remove('printing');fitAll();});
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fitAll);
</script>
</body></html>`;
}
