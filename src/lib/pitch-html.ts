/**
 * ─── Rendu d'une présentation de vente (deck HTML) ────────────────────
 * Plein écran navigable (flèches/clic) + imprimable PDF (1 diapo = 1 page).
 * Design premium, fluide (clamp/vmin) → remplit l'écran sans déborder.
 */

export type PitchBullet = { text: string; figure?: string | null; source?: string | null };
export type PitchSlide = { kind: string; title: string; subtitle?: string | null; bullets: PitchBullet[] };
export type PitchDeck = { headline: string; slides: PitchSlide[]; preview_slug?: string | null };
export type PitchMeta = { clientName: string; sector?: string | null; city?: string | null; previewUrl?: string | null };

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

const TAGS: Record<string, string> = { constat: "Le constat", marche: "Le marché", site: "Votre futur site", offre: "Notre proposition" };

function kpiCards(bullets: PitchBullet[]): string {
  return `<div class="kpis">${bullets.map((b) => `<div class="kpi">
    <div class="kpi-fig">${esc(b.figure)}</div>
    <div class="kpi-txt">${esc(b.text)}</div>
    ${b.source ? `<div class="src">${esc(b.source)}</div>` : ""}
  </div>`).join("")}</div>`;
}

function pointList(bullets: PitchBullet[]): string {
  return `<ul class="pts">${bullets.map((b) => `<li><span class="dot"></span><span>${esc(b.text)}${b.source ? `<span class="src-inline"> — ${esc(b.source)}</span>` : ""}</span></li>`).join("")}</ul>`;
}

function slideHtml(s: PitchSlide, meta: PitchMeta, idx: number, total: number): string {
  const kpis = (s.bullets || []).filter((b) => b.figure);
  const plain = (s.bullets || []).filter((b) => !b.figure);
  const tag = TAGS[s.kind] || "";
  const head = `<div class="s-head">${tag ? `<span class="tag">${tag}</span>` : "<span></span>"}<span class="s-no">${idx} / ${total}</span></div>
    <h2>${esc(s.title)}</h2>${s.subtitle ? `<p class="sub">${esc(s.subtitle)}</p>` : ""}`;

  if (s.kind === "site") {
    const frame = meta.previewUrl
      ? `<div class="mockup"><div class="bar"><span></span><span></span><span></span></div><iframe src="${esc(meta.previewUrl)}" loading="lazy"></iframe></div>`
      : `<div class="mockup empty">Aperçu du site à générer sur la fiche prospect.</div>`;
    return `<section class="slide">${head}
      <div class="site-grid"><div>${plain.length ? pointList(plain) : ""}</div>${frame}</div>
      <div class="foot"><span>${esc(meta.clientName)}</span><span class="wm">Wyngo</span></div></section>`;
  }

  const body = `${kpis.length ? kpiCards(kpis) : ""}${plain.length ? pointList(plain) : ""}`;
  return `<section class="slide ${s.kind === "offre" ? "offer" : ""}">${head}<div class="body">${body}</div>
    <div class="foot"><span>${esc(meta.clientName)}</span><span class="wm">Wyngo</span></div></section>`;
}

export function renderPitchHtml(deck: PitchDeck, meta: PitchMeta): string {
  const slides = Array.isArray(deck.slides) ? deck.slides : [];
  const total = slides.length + 1;
  const cover = `<section class="slide cover">
    <div class="c-brand">Wyngo</div>
    <h1>${esc(deck.headline || meta.clientName)}</h1>
    <p class="c-for">Présentation préparée pour <b>${esc(meta.clientName)}</b></p>
    ${(meta.sector || meta.city) ? `<div class="c-chips">${meta.sector ? `<span>${esc(meta.sector)}</span>` : ""}${meta.city ? `<span>${esc(meta.city)}</span>` : ""}</div>` : ""}
  </section>`;
  const content = slides.map((s, i) => slideHtml(s, meta, i + 2, total)).join("");

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Présentation — ${esc(meta.clientName)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  :root{--v1:#6d28d9;--v2:#a855f7;--ink:#0f172a;--muted:#64748b}
  html,body{height:100%}
  body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#0a0a12;color:var(--ink)}
  .bar2{position:fixed;top:0;left:0;right:0;height:46px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 16px;z-index:50;font-size:12.5px}
  .bar2 b{font-weight:700}
  .bar2 .grp button{background:#fff;color:#0f172a;border:0;padding:7px 13px;border-radius:8px;font-weight:700;cursor:pointer;margin-left:8px;font-size:12.5px}
  .stage{position:fixed;inset:46px 0 52px 0;display:flex;align-items:center;justify-content:center;padding:2.4vmin}
  .slide{display:none;width:100%;height:100%;max-width:1180px;background:#fff;border-radius:20px;box-shadow:0 24px 70px rgba(0,0,0,.5);
    padding:clamp(26px,4.6vmin,60px) clamp(30px,5.4vmin,76px);position:relative;overflow:auto;flex-direction:column;justify-content:center}
  .slide.active{display:flex}
  .slide::before{content:"";position:absolute;left:0;top:0;bottom:0;width:7px;background:linear-gradient(var(--v1),var(--v2))}
  .s-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:clamp(10px,1.6vmin,18px)}
  .tag{font-size:clamp(10px,1.35vmin,13px);font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:var(--v1);background:#f3e8ff;padding:5px 13px;border-radius:999px}
  .s-no{font-size:clamp(10px,1.25vmin,12px);color:#94a3b8;font-variant-numeric:tabular-nums}
  h1{font-size:clamp(30px,5.6vmin,60px);line-height:1.06;letter-spacing:-1.5px}
  h2{font-size:clamp(24px,3.9vmin,44px);line-height:1.12;letter-spacing:-.6px;color:#0f172a}
  .sub{font-size:clamp(14px,1.9vmin,20px);color:var(--muted);margin-top:clamp(6px,1vmin,12px);max-width:52ch}
  .body{margin-top:clamp(14px,2.4vmin,30px)}
  .kpis{display:flex;gap:clamp(12px,1.8vmin,22px);flex-wrap:wrap}
  .kpi{flex:1;min-width:150px;background:linear-gradient(180deg,#faf5ff,#fff);border:1px solid #eddcff;border-radius:16px;padding:clamp(14px,2.2vmin,24px)}
  .kpi-fig{font-size:clamp(30px,5.2vmin,52px);font-weight:800;color:var(--v1);line-height:1;letter-spacing:-1.5px;background:linear-gradient(120deg,var(--v1),var(--v2));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
  .kpi-txt{font-size:clamp(13px,1.6vmin,16px);color:#334155;margin-top:clamp(8px,1.2vmin,12px);line-height:1.4}
  .src,.src-inline{font-size:clamp(10px,1.15vmin,12px);color:#94a3b8}
  .src{margin-top:8px}
  ul.pts{list-style:none;display:flex;flex-direction:column;gap:clamp(10px,1.7vmin,18px)}
  ul.pts li{display:flex;gap:14px;font-size:clamp(15px,2.05vmin,21px);line-height:1.4;color:#1e293b}
  ul.pts .dot{flex:none;width:14px;height:14px;margin-top:.4em;border-radius:5px;background:linear-gradient(var(--v1),var(--v2))}
  .cover{background:radial-gradient(1200px 600px at 15% -10%,#5b21b6,transparent),linear-gradient(135deg,#1e1b4b,#3b0764);color:#fff;justify-content:center}
  .cover::before{background:linear-gradient(#a78bfa,#e9d5ff)}
  .c-brand{font-weight:800;font-size:clamp(16px,2vmin,22px);letter-spacing:.5px;opacity:.85;margin-bottom:clamp(18px,3vmin,30px)}
  .cover h1{color:#fff;max-width:18ch}
  .c-for{color:#e9d5ff;font-size:clamp(14px,1.9vmin,19px);margin-top:clamp(12px,2vmin,20px)}
  .c-chips{display:flex;gap:10px;flex-wrap:wrap;margin-top:clamp(14px,2vmin,20px)}
  .c-chips span{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);color:#fff;padding:6px 14px;border-radius:999px;font-size:clamp(12px,1.5vmin,14px)}
  .site-grid{display:grid;grid-template-columns:1fr 1.15fr;gap:clamp(18px,3vmin,34px);align-items:center;margin-top:clamp(12px,2vmin,22px);flex:1;min-height:0}
  .mockup{border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 16px 40px rgba(0,0,0,.16);background:#fff;align-self:stretch;display:flex;flex-direction:column}
  .mockup .bar{height:28px;background:#f1f5f9;display:flex;align-items:center;gap:6px;padding:0 12px;flex:none}
  .mockup .bar span{width:9px;height:9px;border-radius:50%;background:#cbd5e1}
  .mockup iframe{width:100%;flex:1;min-height:240px;border:0;display:block;background:#fff}
  .mockup.empty{display:flex;align-items:center;justify-content:center;min-height:280px;color:#94a3b8;font-size:14px;text-align:center;padding:24px}
  .offer .body{background:linear-gradient(180deg,#faf5ff,#fff);border:1px solid #eddcff;border-radius:18px;padding:clamp(18px,2.6vmin,30px)}
  .foot{position:absolute;left:clamp(30px,5.4vmin,76px);right:clamp(30px,5.4vmin,76px);bottom:clamp(16px,2.2vmin,26px);display:flex;justify-content:space-between;font-size:clamp(10px,1.2vmin,12px);color:#94a3b8}
  .foot .wm{font-weight:700;color:#c4b5fd}
  .nav{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:14px;background:#0f172a;color:#fff;padding:8px 16px;border-radius:999px;z-index:50}
  .nav button{background:none;border:0;color:#fff;font-size:22px;cursor:pointer;line-height:1}
  .nav .count{font-size:13px;font-variant-numeric:tabular-nums;min-width:56px;text-align:center}
  .fsExit{display:none;position:fixed;top:12px;right:14px;z-index:60;background:rgba(15,23,42,.88);color:#fff;border:0;padding:9px 16px;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer}
  body.fs .bar2{display:none}
  body.fs .stage{inset:0}
  body.fs .fsExit{display:block}
  @media (max-width:760px){
    .bar2{height:44px;font-size:12px;padding:0 10px;gap:8px;flex-wrap:nowrap}
    .bar2>span:first-child{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .bar2 .grp{flex:none;white-space:nowrap;display:flex}
    .bar2 .grp button{padding:6px 9px;font-size:11px;margin-left:6px}
    /* Flux document simple (block) + marges explicites → zéro chevauchement */
    .stage{position:fixed;inset:44px 0 58px 0;padding:10px;display:block;overflow-y:auto;-webkit-overflow-scrolling:touch}
    .slide{display:none;width:100%;height:auto;min-height:0;max-width:none;border-radius:16px;padding:24px 20px 28px;overflow:visible}
    .slide.active{display:block}
    .slide::before{width:6px}
    .s-head{display:flex;justify-content:space-between;align-items:center;margin:0 0 18px}
    h1{font-size:28px;line-height:1.2;letter-spacing:-.5px;margin:0 0 14px}
    h2{font-size:23px;line-height:1.28;margin:0 0 12px}
    .sub{font-size:15px;line-height:1.55;max-width:none;margin:0 0 20px}
    .body{margin:0}
    .kpis{display:block}
    .kpi{display:block;margin:0 0 16px;padding:16px 18px}
    .kpi:last-child{margin-bottom:0}
    .kpi-fig{font-size:32px}
    .kpi-txt{font-size:14.5px;line-height:1.45;margin-top:8px}
    ul.pts{display:block}
    ul.pts li{display:flex;gap:12px;font-size:16px;line-height:1.5;margin:0 0 18px}
    ul.pts li:last-child{margin-bottom:0}
    .site-grid{display:block;margin:0}
    .site-grid>div:first-child{margin-bottom:20px}
    .mockup{display:block}
    .mockup iframe{height:230px;min-height:0}
    .offer .body{padding:18px}
    .foot{position:static;margin-top:24px;left:auto;right:auto}
    .cover{min-height:calc(100vh - 150px)}
    .c-brand{margin-bottom:20px}
    .cover h1{margin-bottom:12px}
    .c-for{margin-top:6px}
    .c-chips{margin-top:18px}
    .nav{bottom:10px;padding:7px 14px}
  }
  @media print{
    @page{size:A4 landscape;margin:0}
    body{background:#fff}
    .bar2,.nav{display:none}
    .stage{position:static;inset:auto;padding:0;display:block}
    .slide{display:flex!important;width:100%;height:100vh;max-width:none;border-radius:0;box-shadow:none;page-break-after:always;overflow:hidden}
    .mockup iframe{min-height:240px}
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
  var slides=[].slice.call(document.querySelectorAll('.slide')),cur=0;
  function show(i){cur=Math.max(0,Math.min(slides.length-1,i));slides.forEach(function(s,j){s.classList.toggle('active',j===cur)});document.getElementById('count').textContent=(cur+1)+' / '+slides.length;}
  function go(d){show(cur+d);}
  function fs(){if(document.fullscreenElement){document.exitFullscreen();}else{(document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen).call(document.documentElement);}}
  document.addEventListener('fullscreenchange',function(){var on=!!document.fullscreenElement;document.body.classList.toggle('fs',on);var b=document.getElementById('fsBtn');if(b)b.textContent=on?'Quitter':'Plein écran';});
  document.addEventListener('keydown',function(e){if(['ArrowRight',' ','PageDown'].includes(e.key)){go(1);e.preventDefault();}else if(['ArrowLeft','PageUp'].includes(e.key)){go(-1);e.preventDefault();}});
  show(0);
</script>
</body></html>`;
}
