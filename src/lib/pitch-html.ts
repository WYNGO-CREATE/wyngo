/**
 * ─── Rendu d'une présentation de vente (deck HTML) ────────────────────
 * Plein écran navigable (flèches/clic) + imprimable en PDF (1 diapo = 1 page).
 * Diapos : couverture · constat · marché · futur site (mockup) · offre.
 */

export type PitchBullet = { text: string; figure?: string | null; source?: string | null };
export type PitchSlide = { kind: string; title: string; subtitle?: string | null; bullets: PitchBullet[] };
export type PitchDeck = { headline: string; slides: PitchSlide[]; preview_slug?: string | null };

export type PitchMeta = { clientName: string; sector?: string | null; city?: string | null; previewUrl?: string | null };

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function bulletsHtml(bullets: PitchBullet[]): string {
  return bullets.map((b) => {
    if (b.figure) {
      return `<div class="kpi">
        <div class="kpi-fig">${esc(b.figure)}</div>
        <div class="kpi-txt">${esc(b.text)}${b.source ? `<span class="src">Source : ${esc(b.source)}</span>` : ""}</div>
      </div>`;
    }
    return `<li>${esc(b.text)}${b.source ? `<span class="src"> — ${esc(b.source)}</span>` : ""}</li>`;
  }).join("");
}

function slideHtml(s: PitchSlide, meta: PitchMeta, idx: number): string {
  const kpis = s.bullets.filter((b) => b.figure);
  const plain = s.bullets.filter((b) => !b.figure);
  const body = `
    ${kpis.length ? `<div class="kpis">${bulletsHtml(kpis)}</div>` : ""}
    ${plain.length ? `<ul class="pts">${bulletsHtml(plain)}</ul>` : ""}`;

  if (s.kind === "site") {
    const frame = meta.previewUrl
      ? `<div class="mockup"><div class="browser"><span></span><span></span><span></span></div><iframe src="${esc(meta.previewUrl)}" loading="lazy"></iframe></div>`
      : `<div class="mockup empty">Génère l'« Aperçu » du site sur la fiche pour l'afficher ici.</div>`;
    return `<section class="slide" data-i="${idx}">
      <div class="tag">Votre futur site</div>
      <h2>${esc(s.title)}</h2>
      ${s.subtitle ? `<p class="sub">${esc(s.subtitle)}</p>` : ""}
      <div class="site-grid"><div class="site-pts">${body}</div>${frame}</div>
    </section>`;
  }

  const tag = s.kind === "constat" ? "Le constat" : s.kind === "marche" ? "Le marché" : s.kind === "offre" ? "Notre proposition" : "";
  return `<section class="slide" data-i="${idx}">
    ${tag ? `<div class="tag">${tag}</div>` : ""}
    <h2>${esc(s.title)}</h2>
    ${s.subtitle ? `<p class="sub">${esc(s.subtitle)}</p>` : ""}
    ${body}
  </section>`;
}

export function renderPitchHtml(deck: PitchDeck, meta: PitchMeta): string {
  const slides = Array.isArray(deck.slides) ? deck.slides : [];
  const cover = `<section class="slide cover" data-i="0">
    <div class="brand">Wyngo</div>
    <h1>${esc(deck.headline || meta.clientName)}</h1>
    <p class="for">Présentation préparée pour <b>${esc(meta.clientName)}</b>${meta.sector ? ` · ${esc(meta.sector)}` : ""}${meta.city ? ` · ${esc(meta.city)}` : ""}</p>
  </section>`;
  const content = slides.map((s, i) => slideHtml(s, meta, i + 1)).join("");
  const total = slides.length + 1;

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Présentation — ${esc(meta.clientName)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  :root{--ink:#0f172a;--violet:#6d28d9;--violet2:#8b5cf6;--muted:#64748b;--bg:#0b1020}
  html,body{height:100%}
  body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#0b1020;color:var(--ink)}
  .toolbar{position:fixed;top:0;left:0;right:0;height:48px;background:#111827;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 16px;z-index:50;font-size:13px}
  .toolbar button{background:#fff;color:#111827;border:0;padding:7px 14px;border-radius:8px;font-weight:700;cursor:pointer;margin-left:8px}
  .toolbar .t-left{opacity:.8}
  .stage{position:fixed;inset:48px 0 0 0;display:flex;align-items:center;justify-content:center;padding:24px}
  .slide{display:none;width:min(960px,94vw);aspect-ratio:16/9;background:#fff;border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.45);padding:54px 64px;position:relative;overflow:hidden;flex-direction:column;justify-content:center}
  .slide.active{display:flex}
  .slide::before{content:"";position:absolute;left:0;top:0;bottom:0;width:8px;background:linear-gradient(var(--violet),var(--violet2))}
  .tag{display:inline-block;align-self:flex-start;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--violet);background:#f3e8ff;padding:5px 12px;border-radius:999px;margin-bottom:16px}
  h1{font-size:46px;line-height:1.1;letter-spacing:-1px;margin-bottom:18px}
  h2{font-size:34px;line-height:1.15;letter-spacing:-.5px;margin-bottom:8px}
  .sub{font-size:17px;color:var(--muted);margin-bottom:22px;max-width:46ch}
  .kpis{display:flex;gap:20px;flex-wrap:wrap;margin-top:8px}
  .kpi{flex:1;min-width:180px;background:#faf7ff;border:1px solid #efe6ff;border-radius:14px;padding:18px 20px}
  .kpi-fig{font-size:40px;font-weight:800;color:var(--violet);line-height:1;letter-spacing:-1px}
  .kpi-txt{font-size:14px;color:#334155;margin-top:8px;line-height:1.4}
  .src{display:block;font-size:11px;color:#94a3b8;margin-top:6px}
  ul.pts{list-style:none;margin-top:10px;display:flex;flex-direction:column;gap:12px}
  ul.pts li{font-size:18px;line-height:1.45;padding-left:30px;position:relative;color:#1e293b}
  ul.pts li::before{content:"";position:absolute;left:0;top:8px;width:14px;height:14px;border-radius:4px;background:linear-gradient(var(--violet),var(--violet2))}
  ul.pts .src{display:inline;font-size:12px}
  .cover{background:linear-gradient(135deg,#1e1b4b,#4c1d95);color:#fff;justify-content:center}
  .cover::before{background:linear-gradient(#a78bfa,#c4b5fd)}
  .cover .brand{font-weight:800;font-size:20px;letter-spacing:.5px;opacity:.9;margin-bottom:24px}
  .cover h1{color:#fff;max-width:20ch}
  .cover .for{color:#ddd6fe;font-size:16px}
  .site-grid{display:grid;grid-template-columns:1fr 1.1fr;gap:28px;align-items:center;margin-top:6px}
  .site-pts ul.pts li{font-size:16px}
  .mockup{border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 12px 30px rgba(0,0,0,.12);background:#fff}
  .mockup .browser{height:26px;background:#f1f5f9;display:flex;align-items:center;gap:6px;padding:0 12px}
  .mockup .browser span{width:9px;height:9px;border-radius:50%;background:#cbd5e1}
  .mockup iframe{width:100%;height:300px;border:0;display:block;background:#fff}
  .mockup.empty{display:flex;align-items:center;justify-content:center;height:330px;color:#94a3b8;font-size:14px;text-align:center;padding:20px}
  .nav{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:14px;background:#111827;color:#fff;padding:8px 16px;border-radius:999px;z-index:50}
  .nav button{background:none;border:0;color:#fff;font-size:20px;cursor:pointer;line-height:1}
  .nav .count{font-size:13px;font-variant-numeric:tabular-nums;min-width:54px;text-align:center}
  @media print{
    @page{size:A4 landscape;margin:0}
    body{background:#fff}
    .toolbar,.nav{display:none}
    .stage{position:static;inset:auto;padding:0}
    .slide{display:flex!important;width:100%;aspect-ratio:auto;height:100vh;border-radius:0;box-shadow:none;page-break-after:always}
    .mockup iframe{height:260px}
  }
</style></head>
<body>
  <div class="toolbar">
    <span class="t-left">Présentation · ${esc(meta.clientName)}</span>
    <span>
      <button onclick="fs()">Plein écran</button>
      <button onclick="window.print()">Imprimer / PDF</button>
    </span>
  </div>
  <div class="stage" id="stage">${cover}${content}</div>
  <div class="nav">
    <button onclick="go(-1)">‹</button>
    <span class="count" id="count">1 / ${total}</span>
    <button onclick="go(1)">›</button>
  </div>
<script>
  var slides=[].slice.call(document.querySelectorAll('.slide'));var cur=0;
  function show(i){cur=Math.max(0,Math.min(slides.length-1,i));slides.forEach(function(s,j){s.classList.toggle('active',j===cur)});document.getElementById('count').textContent=(cur+1)+' / '+slides.length;}
  function go(d){show(cur+d);}
  function fs(){var e=document.documentElement;if(document.fullscreenElement){document.exitFullscreen();}else if(e.requestFullscreen){e.requestFullscreen();}}
  document.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key===' '||e.key==='PageDown'){go(1);e.preventDefault();}else if(e.key==='ArrowLeft'||e.key==='PageUp'){go(-1);e.preventDefault();}});
  show(0);
</script>
</body></html>`;
}
