/**
 * ─── Wyngo Design System — moteur de style des sites Studio ────────────
 *
 * Principe : un design-system commun (classes `.wy-*`) + des PACKS de style
 * interchangeables (typo + palette + motion + texture). Changer de pack
 * re-skinne instantanément toutes les sections `.wy-*` du site.
 *
 * Typographies : uniquement Inter, Fraunces, Archivo, Playfair Display
 * (les 4 validées). Les ambiances couleur/motion s'inspirent des 8 visions.
 *
 * Le tout vit dans le HTML du site :
 *   <link id="wy-fonts">  +  <style id="wy-ds">  +  <body class="wy-scope" data-wy="...">
 *   + un script reveal-on-scroll (#wy-reveal-js) en fin de body.
 */

export const WY_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Playfair+Display:wght@500;600;700&display=swap";

export type Pack = { id: string; label: string; note: string; vars: string };

// Chaque pack ne définit que des variables CSS (typo, palette, rayon, accent2)
export const PACKS: Pack[] = [
  { id: "editorial", label: "Éditorial cobalt", note: "Inter · clair, rigoureux, premium discret",
    vars: "--wy-display:'Inter';--wy-body:'Inter';--wy-dw:600;--wy-bg:#F7F4EC;--wy-bg2:#F0ECE0;--wy-ink:#16140f;--wy-muted:#5b564c;--wy-surface:#fffdf7;--wy-accent:#1B4BE3;--wy-accent2:#3b5bdb;--wy-radius:12px" },
  { id: "couture", label: "Couture ivoire-or", note: "Fraunces · raffiné, luxe artisanal",
    vars: "--wy-display:'Fraunces';--wy-body:'Inter';--wy-dw:600;--wy-bg:#FBF8F3;--wy-bg2:#F4ECDF;--wy-ink:#2b211a;--wy-muted:#6b5d4d;--wy-surface:#ffffff;--wy-accent:#b08d4f;--wy-accent2:#caa86a;--wy-radius:14px" },
  { id: "brutalist", label: "Brutalist contraste", note: "Archivo · audacieux, statement",
    vars: "--wy-display:'Archivo';--wy-body:'Inter';--wy-dw:800;--wy-up:uppercase;--wy-bg:#ffffff;--wy-bg2:#f2f2f2;--wy-ink:#111111;--wy-muted:#444444;--wy-surface:#ffffff;--wy-accent:#ff4d2e;--wy-accent2:#ff7a2e;--wy-radius:4px" },
  { id: "magazine", label: "Magazine", note: "Playfair · éditorial, culturel",
    vars: "--wy-display:'Playfair Display';--wy-body:'Inter';--wy-dw:700;--wy-bg:#fafafa;--wy-bg2:#f0f0f0;--wy-ink:#141414;--wy-muted:#555555;--wy-surface:#ffffff;--wy-accent:#b3261e;--wy-accent2:#d23a2e;--wy-radius:6px" },
  { id: "darkluxe", label: "Dark luxe", note: "Fraunces · sombre, or, exclusif",
    vars: "--wy-display:'Fraunces';--wy-body:'Inter';--wy-dw:600;--wy-bg:#0e0e12;--wy-bg2:#15151c;--wy-ink:#f3ece0;--wy-muted:#9a958c;--wy-surface:#17171f;--wy-accent:#c9a86a;--wy-accent2:#e0c081;--wy-radius:12px;--wy-blend:screen" },
  { id: "organic", label: "Organique terre", note: "Fraunces · chaleureux, humain",
    vars: "--wy-display:'Fraunces';--wy-body:'Inter';--wy-dw:600;--wy-bg:#FCF6EF;--wy-bg2:#F6E9DA;--wy-ink:#3d2a1d;--wy-muted:#6e5848;--wy-surface:#ffffff;--wy-accent:#d98d4f;--wy-accent2:#e0a45f;--wy-radius:22px" },
  { id: "noir", label: "Magazine noir", note: "Playfair · contrasté, mode",
    vars: "--wy-display:'Playfair Display';--wy-body:'Inter';--wy-dw:700;--wy-bg:#111114;--wy-bg2:#1a1a1f;--wy-ink:#f5f3ee;--wy-muted:#a09b92;--wy-surface:#1a1a20;--wy-accent:#e8b04b;--wy-accent2:#f0c062;--wy-radius:6px;--wy-blend:screen" },
  { id: "tech", label: "Tech dégradé", note: "Inter · moderne, produit",
    vars: "--wy-display:'Inter';--wy-body:'Inter';--wy-dw:700;--wy-bg:#fbfbfd;--wy-bg2:#f1f2f7;--wy-ink:#16161d;--wy-muted:#5a5a66;--wy-surface:#ffffff;--wy-accent:#5b54e6;--wy-accent2:#22d3ee;--wy-radius:14px" },
  { id: "artefact", label: "Studio ivoire chaud", note: "Inter Tight · éditorial premium, accent pêche",
    vars: "--wy-display:'Inter Tight';--wy-body:'Inter';--wy-dw:600;--wy-bg:#F4EDDF;--wy-bg2:#EBE0CF;--wy-ink:#221F1D;--wy-muted:#6b6156;--wy-surface:#FBF6EC;--wy-accent:#C56B43;--wy-accent2:#F4A789;--wy-radius:20px" },
  { id: "carbon", label: "Studio carbone", note: "Inter Tight · sombre chaud, pêche lumineux",
    vars: "--wy-display:'Inter Tight';--wy-body:'Inter';--wy-dw:600;--wy-bg:#17140f;--wy-bg2:#221d17;--wy-ink:#F6EFE3;--wy-muted:#b7ad9e;--wy-surface:#2a2319;--wy-accent:#F4A789;--wy-accent2:#E8956B;--wy-radius:20px;--wy-blend:screen" },
];

// CSS commun — toutes les sections s'appuient dessus, le pack ne change que les vars
const WY_COMMON = `
.wy-scope{font-family:var(--wy-body),system-ui,sans-serif}
.wy-wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.wy-section{padding:clamp(60px,9vw,132px) 0;position:relative;overflow:hidden}
.wy-eyebrow{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;color:var(--wy-accent);display:inline-flex;align-items:center;gap:10px}
.wy-eyebrow::before{content:"";width:26px;height:1px;background:var(--wy-accent);flex:none}
.wy-h1{font-family:var(--wy-display),serif;font-weight:var(--wy-dw,700);font-size:clamp(2.3rem,6vw,5rem);line-height:1.02;letter-spacing:-.02em;margin:0;text-transform:var(--wy-up,none)}
.wy-h2{font-family:var(--wy-display),serif;font-weight:var(--wy-dw,700);font-size:clamp(1.8rem,3.6vw,3rem);line-height:1.05;letter-spacing:-.015em;margin:0;text-transform:var(--wy-up,none)}
.wy-lead{font-size:clamp(1.05rem,1.4vw,1.3rem);line-height:1.6;color:var(--wy-muted);font-weight:300}
.wy-grad{background:linear-gradient(90deg,var(--wy-ink),color-mix(in srgb,var(--wy-ink) 45%,var(--wy-bg)));-webkit-background-clip:text;background-clip:text;color:transparent}
.wy-btn{display:inline-block;background:var(--wy-ink);color:var(--wy-bg);padding:15px 32px;border-radius:var(--wy-radius);font-weight:600;text-decoration:none;font-family:var(--wy-body);transition:transform .4s cubic-bezier(.22,.61,.36,1),background .3s,color .3s}
.wy-btn:hover{transform:translateY(-2px);background:var(--wy-accent);color:#fff}
.wy-btn-ghost{display:inline-block;padding:15px 30px;border-radius:var(--wy-radius);border:1px solid color-mix(in srgb,var(--wy-ink) 25%,transparent);color:var(--wy-ink);text-decoration:none;font-weight:600;font-family:var(--wy-body);transition:.3s}
.wy-btn-ghost:hover{border-color:var(--wy-ink);background:color-mix(in srgb,var(--wy-ink) 6%,transparent)}
.wy-icontile{width:54px;height:54px;border-radius:calc(var(--wy-radius) + 3px);background:var(--wy-ink);color:var(--wy-bg);display:flex;align-items:center;justify-content:center;box-shadow:0 14px 30px -14px color-mix(in srgb,var(--wy-ink) 60%,transparent)}
.wy-steps{display:flex;flex-direction:column;gap:18px;position:relative}
.wy-line{position:absolute;left:34px;top:14px;bottom:22px;width:1px;background:linear-gradient(to bottom,var(--wy-accent),color-mix(in srgb,var(--wy-ink) 12%,transparent),transparent)}
.wy-step{display:flex;gap:16px;background:var(--wy-surface);border:1px solid color-mix(in srgb,var(--wy-ink) 9%,transparent);border-radius:18px;padding:20px;position:relative;z-index:1;transition:transform .45s cubic-bezier(.22,.61,.36,1),border-color .45s}
.wy-step:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--wy-accent) 45%,transparent)}
.wy-sico{width:44px;height:44px;border-radius:50%;background:var(--wy-bg2);color:var(--wy-ink);display:flex;align-items:center;justify-content:center;flex:none;transition:.45s}
.wy-step:hover .wy-sico{background:var(--wy-ink);color:var(--wy-bg);transform:scale(1.08)}
.wy-num{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-size:.62rem;color:color-mix(in srgb,var(--wy-ink) 45%,transparent)}
.wy-card{background:var(--wy-surface);border:1px solid color-mix(in srgb,var(--wy-ink) 8%,transparent);border-radius:18px;padding:26px;transition:transform .45s cubic-bezier(.22,.61,.36,1),box-shadow .45s}
.wy-card:hover{transform:translateY(-4px);box-shadow:0 28px 56px -24px color-mix(in srgb,var(--wy-ink) 40%,transparent)}
.wy-pill{display:inline-flex;align-items:center;gap:10px;padding:9px 18px;background:var(--wy-surface);border:1px solid color-mix(in srgb,var(--wy-ink) 12%,transparent);border-radius:999px;font-size:.85rem;font-weight:500;color:var(--wy-ink)}
.wy-dot{width:8px;height:8px;border-radius:50%;background:var(--wy-accent);position:relative;flex:none}
.wy-dot::before{content:"";position:absolute;inset:0;border-radius:50%;background:var(--wy-accent);animation:wyp 1.8s ease-out infinite}
@keyframes wyp{0%{transform:scale(1);opacity:.5}100%{transform:scale(2.6);opacity:0}}
.wy-reveal{opacity:0;transform:translateY(26px);transition:opacity .9s cubic-bezier(.22,.61,.36,1),transform .9s cubic-bezier(.22,.61,.36,1)}
.wy-reveal.in{opacity:1;transform:none}
.wy-d1{transition-delay:.08s}.wy-d2{transition-delay:.16s}.wy-d3{transition-delay:.24s}
.wy-dots{background-image:radial-gradient(circle,color-mix(in srgb,var(--wy-ink) 9%,transparent) 1px,transparent 1px);background-size:18px 18px}
.wy-grid2{display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(32px,5vw,80px);align-items:center}
.wy-gal{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.wy-gal img{width:100%;height:100%;object-fit:cover;aspect-ratio:1;border-radius:14px;transition:transform .8s cubic-bezier(.22,.61,.36,1)}
.wy-gal a:hover img{transform:scale(1.05)}
@media(max-width:860px){.wy-grid2{grid-template-columns:1fr}.wy-gal{grid-template-columns:repeat(2,1fr)}.wy-line{display:none}}
/* ── Motion premium (inspiration studio éditorial warm) — 100% CSS, léger ── */
.wy-aurora{background:linear-gradient(100deg,var(--wy-ink),var(--wy-accent),var(--wy-accent2),var(--wy-ink));background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:wy-aur 9s ease-in-out infinite}
@keyframes wy-aur{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.wy-blobs{position:absolute;inset:0;overflow:hidden;pointer-events:none;filter:blur(64px);opacity:.5}
.wy-blob{position:absolute;width:44vw;height:44vw;border-radius:50%;mix-blend-mode:var(--wy-blend,multiply);will-change:transform}
.wy-blob.b1{background:radial-gradient(circle,var(--wy-accent),transparent 70%);top:-14%;left:-8%;animation:wy-drift1 24s ease-in-out infinite}
.wy-blob.b2{background:radial-gradient(circle,var(--wy-accent2),transparent 70%);bottom:-18%;right:-10%;animation:wy-drift2 28s ease-in-out infinite}
.wy-blob.b3{background:radial-gradient(circle,color-mix(in srgb,var(--wy-accent) 55%,var(--wy-accent2)),transparent 70%);top:26%;left:42%;animation:wy-drift1 32s ease-in-out infinite reverse}
@keyframes wy-drift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(6%,8%) scale(1.12)}}
@keyframes wy-drift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-7%,-6%) scale(1.08)}}
.wy-grain{position:absolute;inset:0;pointer-events:none;opacity:.05;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");animation:wy-grain 8s steps(6) infinite}
@keyframes wy-grain{0%{transform:translate(0,0)}20%{transform:translate(-4%,3%)}40%{transform:translate(3%,-2%)}60%{transform:translate(-2%,4%)}80%{transform:translate(4%,-3%)}100%{transform:translate(0,0)}}
.wy-marquee{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.wy-track{display:flex;width:max-content;animation:wy-mq 34s linear infinite}
.wy-marquee:hover .wy-track{animation-play-state:paused}
.wy-mq-item{display:inline-flex;align-items:center;gap:22px;padding:0 26px;font-family:var(--wy-display),serif;font-size:clamp(1.4rem,3vw,2.4rem);font-weight:var(--wy-dw,600);letter-spacing:-.01em;white-space:nowrap;color:var(--wy-ink)}
.wy-mq-item::after{content:"◆";color:var(--wy-accent);font-size:.5em}
@keyframes wy-mq{to{transform:translateX(-50%)}}
.wy-avail{display:inline-flex;align-items:center;gap:9px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--wy-muted)}
.wy-avail i{width:8px;height:8px;border-radius:50%;background:#3fb950;box-shadow:0 0 0 0 rgba(63,185,80,.5);animation:wy-av 2s infinite;flex:none}
@keyframes wy-av{0%{box-shadow:0 0 0 0 rgba(63,185,80,.5)}70%{box-shadow:0 0 0 9px rgba(63,185,80,0)}100%{box-shadow:0 0 0 0 rgba(63,185,80,0)}}
.wy-btn:hover,.wy-icontile{transition-timing-function:cubic-bezier(.34,1.56,.64,1)}
@media(prefers-reduced-motion:reduce){.wy-aurora,.wy-blob,.wy-grain,.wy-track,.wy-avail i{animation:none!important}}
/* ── Composants "systèmes" (inspiration studio tech : micro-chiffres, bento, capacités, tarifs) ── */
.wy-pillrow{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
.wy-statpill{display:inline-flex;align-items:center;gap:8px;padding:8px 15px;border-radius:999px;border:1px solid color-mix(in srgb,var(--wy-ink) 14%,transparent);background:color-mix(in srgb,var(--wy-surface) 70%,transparent);font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.72rem;letter-spacing:.03em;color:var(--wy-muted)}
.wy-statpill b{color:var(--wy-ink);font-weight:600}
.wy-bento{display:grid;grid-template-columns:repeat(6,1fr);gap:16px}
.wy-bento>*{background:var(--wy-surface);border:1px solid color-mix(in srgb,var(--wy-ink) 12%,transparent);border-radius:20px;padding:26px;transition:transform .5s cubic-bezier(.16,1,.3,1),border-color .5s}
.wy-bento>*:hover{transform:translateY(-4px);border-color:color-mix(in srgb,var(--wy-accent) 50%,transparent)}
.wy-b-3{grid-column:span 3}.wy-b-2{grid-column:span 2}.wy-b-4{grid-column:span 4}.wy-b-6{grid-column:span 6}
.wy-bento .k{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;color:var(--wy-accent);margin:0 0 12px}
.wy-bento h3{font-family:var(--wy-display),sans-serif;font-weight:var(--wy-dw,600);font-size:1.25rem;letter-spacing:-.01em;margin:0 0 8px;color:var(--wy-ink)}
.wy-bento p{margin:0;color:var(--wy-muted);font-size:.92rem;line-height:1.55}
.wy-bignum{font-family:var(--wy-display),sans-serif;font-weight:var(--wy-dw,600);font-size:clamp(2.6rem,5vw,3.8rem);line-height:.95;letter-spacing:-.03em;color:var(--wy-ink)}
.wy-bignum span{color:var(--wy-accent)}
.wy-tools{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.wy-tool{display:flex;align-items:center;gap:12px;padding:15px 18px;background:var(--wy-surface);border:1px solid color-mix(in srgb,var(--wy-ink) 10%,transparent);border-radius:14px;transition:transform .4s cubic-bezier(.16,1,.3,1),border-color .4s}
.wy-tool:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--wy-accent) 55%,transparent)}
.wy-tool .tk{width:34px;height:34px;border-radius:9px;background:color-mix(in srgb,var(--wy-accent) 16%,transparent);color:var(--wy-accent);display:flex;align-items:center;justify-content:center;flex:none;font-family:'JetBrains Mono',monospace;font-size:.7rem;font-weight:600}
.wy-tool span{font-weight:500;font-size:.94rem;color:var(--wy-ink)}
.wy-tiers{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px;align-items:stretch}
.wy-tier{position:relative;display:flex;flex-direction:column;background:var(--wy-surface);border:1px solid color-mix(in srgb,var(--wy-ink) 12%,transparent);border-radius:22px;padding:28px 26px;transition:transform .5s cubic-bezier(.16,1,.3,1)}
.wy-tier:hover{transform:translateY(-5px)}
.wy-tier.reco{border-color:var(--wy-accent);box-shadow:0 24px 60px -30px color-mix(in srgb,var(--wy-accent) 70%,transparent)}
.wy-tier .badge{position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:var(--wy-accent);color:#1a1208;font-size:.66rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 13px;border-radius:999px}
.wy-tier .tn{font-family:'JetBrains Mono',monospace;font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:var(--wy-muted)}
.wy-tier .tp{font-family:var(--wy-display),sans-serif;font-weight:var(--wy-dw,600);font-size:2.6rem;letter-spacing:-.03em;margin:10px 0 2px;color:var(--wy-ink)}
.wy-tier .tp small{font-size:.9rem;font-weight:400;color:var(--wy-muted)}
.wy-tier .tt{color:var(--wy-muted);font-size:.86rem;margin:0 0 18px}
.wy-tier ul{list-style:none;margin:0 0 22px;padding:0;display:flex;flex-direction:column;gap:10px;flex:1}
.wy-tier li{display:flex;gap:9px;font-size:.9rem;color:var(--wy-ink);line-height:1.4}
.wy-tier li::before{content:"✓";color:var(--wy-accent);font-weight:700;flex:none}
@media(max-width:860px){.wy-bento{grid-template-columns:repeat(2,1fr)}.wy-b-3,.wy-b-4,.wy-b-6{grid-column:span 2}.wy-b-2{grid-column:span 1}}
`;

export function buildDsCss(packId: string): string {
  const pack = PACKS.find((p) => p.id === packId) || PACKS[0];
  return `${WY_COMMON}\n.wy-scope{${pack.vars}}`;
}

export const REVEAL_SCRIPT =
  `<script id="wy-reveal-js">(function(){function r(){var o=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');o.unobserve(e.target);}});},{threshold:.12,rootMargin:'0px 0px -40px 0px'});document.querySelectorAll('.wy-reveal:not(.in)').forEach(function(el){o.observe(el);});}if(document.readyState!=='loading')r();else document.addEventListener('DOMContentLoaded',r);})();</script>`;

// ── Bibliothèque de sections (HTML utilisant les classes .wy-*) ─────────
const ICO = {
  eye: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  chat: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 1 4 7.5L3 21Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>`,
  star: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.4 5 5.6.7-4 3.8 1 5.5-5-2.8-5 2.8 1-5.5-4-3.8 5.6-.7Z"/></svg>`,
  cube: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 7v10l8 5 8-5V7Z"/><path d="m4 7 8 5 8-5"/><path d="M12 12v10"/></svg>`,
};

export type Section = { id: string; label: string; html: string };

export const SECTIONS: Section[] = [
  {
    id: "hero", label: "Hero (titre principal)",
    html: `
<section class="wy-section" style="background:var(--wy-bg);padding-top:clamp(80px,12vw,160px)">
  <div class="wy-dots" style="position:absolute;inset:0;opacity:.4;pointer-events:none"></div>
  <div class="wy-wrap" style="position:relative;z-index:1;text-align:center;max-width:880px">
    <p class="wy-eyebrow wy-reveal" style="justify-content:center;margin-bottom:22px">{{NAME}}</p>
    <h1 class="wy-h1 wy-grad wy-reveal wy-d1">Votre savoir-faire,<br>enfin à votre image.</h1>
    <p class="wy-lead wy-reveal wy-d2" style="max-width:560px;margin:24px auto 32px">Une présence en ligne soignée, pensée pour faire venir vos clients.</p>
    <div class="wy-reveal wy-d3" style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
      <a href="#contact" class="wy-btn">Nous contacter</a>
      <a href="#services" class="wy-btn-ghost">Découvrir</a>
    </div>
  </div>
</section>`,
  },
  {
    id: "services", label: "Spécialités (escalier)",
    html: `
<section class="wy-section" style="background:var(--wy-bg2)">
  <div class="wy-dots" style="position:absolute;inset:0;opacity:.35;pointer-events:none;-webkit-mask-image:linear-gradient(to right,#000,transparent 75%);mask-image:linear-gradient(to right,#000,transparent 75%)"></div>
  <div class="wy-wrap" style="position:relative;z-index:1">
    <div class="wy-grid2">
      <div class="wy-reveal">
        <p class="wy-eyebrow" style="margin-bottom:22px">01 — Nos spécialités</p>
        <div class="wy-icontile" style="margin-bottom:24px">${ICO.cube}</div>
        <h2 class="wy-h2 wy-grad">Le savoir-faire<br>au cœur du métier.</h2>
        <p class="wy-lead" style="margin:22px 0 28px">Une expertise locale, des prestations de qualité, un vrai accompagnement.</p>
        <div class="wy-pill"><span class="wy-dot"></span><span>Un travail sur-mesure, près de chez vous.</span></div>
      </div>
      <div style="position:relative" class="wy-reveal wy-d1">
        <div class="wy-line"></div>
        <div class="wy-steps">
          <div class="wy-step"><div class="wy-sico">${ICO.eye}</div><div><h3 style="font-weight:600;margin:0 0 5px;font-size:.98rem">Première prestation <span class="wy-num">[01]</span></h3><p style="margin:0;font-size:.85rem;color:var(--wy-muted);line-height:1.5">Décrivez ici votre offre phare et ce qui la rend unique.</p></div></div>
          <div class="wy-step" style="margin-left:0"><div class="wy-sico">${ICO.chat}</div><div><h3 style="font-weight:600;margin:0 0 5px;font-size:.98rem">Deuxième prestation <span class="wy-num">[02]</span></h3><p style="margin:0;font-size:.85rem;color:var(--wy-muted);line-height:1.5">Un service que vos clients recherchent vraiment.</p></div></div>
          <div class="wy-step"><div class="wy-sico">${ICO.star}</div><div><h3 style="font-weight:600;margin:0 0 5px;font-size:.98rem">Troisième prestation <span class="wy-num">[03]</span></h3><p style="margin:0;font-size:.85rem;color:var(--wy-muted);line-height:1.5">Un atout différenciant : rapidité, garantie, proximité.</p></div></div>
        </div>
      </div>
    </div>
  </div>
</section>`,
  },
  {
    id: "about", label: "À propos (texte + image)",
    html: `
<section class="wy-section" style="background:var(--wy-bg)">
  <div class="wy-wrap"><div class="wy-grid2">
    <div class="wy-reveal" style="border-radius:18px;aspect-ratio:4/3;background:var(--wy-bg2);display:flex;align-items:center;justify-content:center;color:var(--wy-muted);font-size:.85rem;border:1px dashed color-mix(in srgb,var(--wy-ink) 18%,transparent)">＋ Votre photo</div>
    <div class="wy-reveal wy-d1">
      <p class="wy-eyebrow" style="margin-bottom:20px">02 — Notre histoire</p>
      <h2 class="wy-h2 wy-grad">Une maison qui<br>vous ressemble.</h2>
      <p class="wy-lead" style="margin:22px 0 18px">Racontez ici votre parcours, vos valeurs, ce qui vous anime au quotidien.</p>
      <p style="color:var(--wy-muted);line-height:1.65">Un paragraphe plus détaillé pour donner de l'épaisseur et créer la confiance avec vos futurs clients.</p>
    </div>
  </div></div>
</section>`,
  },
  {
    id: "gallery", label: "Galerie (grille)",
    html: `
<section class="wy-section" style="background:var(--wy-bg2)">
  <div class="wy-wrap">
    <div class="wy-reveal" style="text-align:center;margin-bottom:48px">
      <p class="wy-eyebrow" style="justify-content:center;margin-bottom:18px">03 — En images</p>
      <h2 class="wy-h2 wy-grad">Notre univers</h2>
    </div>
    <div class="wy-gal wy-reveal wy-d1">
      <div style="aspect-ratio:1;border-radius:14px;background:var(--wy-bg);display:flex;align-items:center;justify-content:center;color:var(--wy-muted);font-size:.85rem;border:1px dashed color-mix(in srgb,var(--wy-ink) 18%,transparent)">＋ Photo</div>
      <div style="aspect-ratio:1;border-radius:14px;background:var(--wy-bg);display:flex;align-items:center;justify-content:center;color:var(--wy-muted);font-size:.85rem;border:1px dashed color-mix(in srgb,var(--wy-ink) 18%,transparent)">＋ Photo</div>
      <div style="aspect-ratio:1;border-radius:14px;background:var(--wy-bg);display:flex;align-items:center;justify-content:center;color:var(--wy-muted);font-size:.85rem;border:1px dashed color-mix(in srgb,var(--wy-ink) 18%,transparent)">＋ Photo</div>
    </div>
  </div>
</section>`,
  },
  {
    id: "reviews", label: "Avis clients (3 cartes)",
    html: `
<section class="wy-section" style="background:var(--wy-bg)">
  <div class="wy-wrap">
    <div class="wy-reveal" style="text-align:center;margin-bottom:48px">
      <p class="wy-eyebrow" style="justify-content:center;margin-bottom:18px">Ils nous font confiance</p>
      <h2 class="wy-h2 wy-grad">Ce qu'ils en disent</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px">
      <div class="wy-card wy-reveal"><div style="color:var(--wy-accent);margin-bottom:12px">★★★★★</div><p style="font-style:italic;line-height:1.55;margin:0 0 16px">« Un travail impeccable, je recommande vivement. »</p><p style="font-weight:600;margin:0;font-size:.9rem">Marie D.</p></div>
      <div class="wy-card wy-reveal wy-d1"><div style="color:var(--wy-accent);margin-bottom:12px">★★★★★</div><p style="font-style:italic;line-height:1.55;margin:0 0 16px">« Accueil chaleureux et résultat à la hauteur. »</p><p style="font-weight:600;margin:0;font-size:.9rem">Julien P.</p></div>
      <div class="wy-card wy-reveal wy-d2"><div style="color:var(--wy-accent);margin-bottom:12px">★★★★★</div><p style="font-style:italic;line-height:1.55;margin:0 0 16px">« Des professionnels à l'écoute, rien à redire. »</p><p style="font-weight:600;margin:0;font-size:.9rem">Sophie L.</p></div>
    </div>
  </div>
</section>`,
  },
  {
    id: "cta", label: "Appel à l'action",
    html: `
<section class="wy-section" id="contact" style="background:var(--wy-ink)">
  <div class="wy-wrap" style="text-align:center;max-width:680px">
    <h2 class="wy-h2 wy-reveal" style="color:var(--wy-bg)">Parlons de votre projet.</h2>
    <p class="wy-reveal wy-d1" style="color:color-mix(in srgb,var(--wy-bg) 75%,transparent);font-size:1.1rem;margin:18px 0 30px">Réponse sous 24h · devis gratuit.</p>
    <div class="wy-reveal wy-d2"><a href="tel:+33" class="wy-btn" style="background:var(--wy-accent);color:#fff">Nous appeler</a></div>
  </div>
</section>`,
  },
  {
    id: "hero-split", label: "Hero · split (texte + image)",
    html: `
<section class="wy-section" style="background:var(--wy-bg);padding-top:clamp(72px,10vw,130px)">
  <div class="wy-wrap"><div class="wy-grid2">
    <div class="wy-reveal">
      <p class="wy-eyebrow" style="margin-bottom:20px">{{NAME}}</p>
      <h1 class="wy-h1 wy-grad">Un savoir-faire<br>qui se voit.</h1>
      <p class="wy-lead" style="margin:22px 0 30px">Une présence en ligne soignée, à votre image, pensée pour convertir.</p>
      <div style="display:flex;gap:14px;flex-wrap:wrap"><a href="#contact" class="wy-btn">Nous contacter</a><a href="#services" class="wy-btn-ghost">Nos services</a></div>
    </div>
    <div class="wy-reveal wy-d1" style="border-radius:18px;aspect-ratio:4/5;background:var(--wy-bg2);display:flex;align-items:center;justify-content:center;color:var(--wy-muted);font-size:.85rem;border:1px dashed color-mix(in srgb,var(--wy-ink) 18%,transparent)">＋ Votre photo</div>
  </div></div>
</section>`,
  },
  {
    id: "hero-minimal", label: "Hero · minimal (épuré)",
    html: `
<section class="wy-section" style="background:var(--wy-bg);min-height:70vh;display:flex;align-items:center;justify-content:center;text-align:center">
  <div class="wy-wrap" style="max-width:760px">
    <p class="wy-eyebrow wy-reveal" style="justify-content:center;margin-bottom:28px">{{NAME}}</p>
    <h1 class="wy-h1 wy-reveal wy-d1" style="font-size:clamp(2.6rem,7vw,6rem)">L'essentiel,<br>fait avec exigence.</h1>
    <div class="wy-reveal wy-d2" style="margin-top:36px"><a href="#contact" class="wy-btn-ghost">Prendre contact</a></div>
  </div>
</section>`,
  },
  {
    id: "hero-aurora", label: "Hero · aurora (blobs + grain)",
    html: `
<section class="wy-section" style="background:var(--wy-bg);padding-top:clamp(96px,14vw,190px)">
  <div class="wy-blobs"><span class="wy-blob b1"></span><span class="wy-blob b2"></span><span class="wy-blob b3"></span></div>
  <div class="wy-grain"></div>
  <div class="wy-wrap" style="position:relative;z-index:1;text-align:center;max-width:940px">
    <p class="wy-avail wy-reveal" style="justify-content:center;margin-bottom:24px"><i></i> Disponible pour de nouveaux projets</p>
    <h1 class="wy-h1 wy-aurora wy-reveal wy-d1">Votre savoir-faire,<br>sublimé en ligne.</h1>
    <p class="wy-lead wy-reveal wy-d2" style="max-width:580px;margin:26px auto 34px">Une présence digitale premium, pensée pour attirer et convertir vos clients.</p>
    <div class="wy-reveal wy-d3" style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
      <a href="#contact" class="wy-btn">Démarrer un projet</a>
      <a href="#services" class="wy-btn-ghost">Voir le travail</a>
    </div>
  </div>
</section>`,
  },
  {
    id: "marquee", label: "Bandeau défilant (marquee)",
    html: `
<section class="wy-section" style="background:var(--wy-bg2);padding:clamp(34px,5vw,64px) 0">
  <div class="wy-marquee">
    <div class="wy-track">
      <span class="wy-mq-item">Sur-mesure</span><span class="wy-mq-item">Proximité</span><span class="wy-mq-item">Savoir-faire</span><span class="wy-mq-item">Qualité</span><span class="wy-mq-item">Confiance</span>
      <span class="wy-mq-item">Sur-mesure</span><span class="wy-mq-item">Proximité</span><span class="wy-mq-item">Savoir-faire</span><span class="wy-mq-item">Qualité</span><span class="wy-mq-item">Confiance</span>
    </div>
  </div>
</section>`,
  },
  {
    id: "stats", label: "Chiffres clés",
    html: `
<section class="wy-section" style="background:var(--wy-bg2)">
  <div class="wy-wrap">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:24px;text-align:center">
      <div class="wy-reveal"><div style="font-family:var(--wy-display);font-weight:var(--wy-dw);font-size:clamp(2.4rem,5vw,3.6rem);color:var(--wy-accent);line-height:1">+12</div><p style="color:var(--wy-muted);margin:8px 0 0">ans d'expérience</p></div>
      <div class="wy-reveal wy-d1"><div style="font-family:var(--wy-display);font-weight:var(--wy-dw);font-size:clamp(2.4rem,5vw,3.6rem);color:var(--wy-accent);line-height:1">2 400+</div><p style="color:var(--wy-muted);margin:8px 0 0">clients satisfaits</p></div>
      <div class="wy-reveal wy-d2"><div style="font-family:var(--wy-display);font-weight:var(--wy-dw);font-size:clamp(2.4rem,5vw,3.6rem);color:var(--wy-accent);line-height:1">4,9★</div><p style="color:var(--wy-muted);margin:8px 0 0">note moyenne</p></div>
      <div class="wy-reveal wy-d3"><div style="font-family:var(--wy-display);font-weight:var(--wy-dw);font-size:clamp(2.4rem,5vw,3.6rem);color:var(--wy-accent);line-height:1">24h</div><p style="color:var(--wy-muted);margin:8px 0 0">délai de réponse</p></div>
    </div>
  </div>
</section>`,
  },
  {
    id: "pricing", label: "Tarifs (3 formules)",
    html: `
<section class="wy-section" style="background:var(--wy-bg)">
  <div class="wy-wrap">
    <div class="wy-reveal" style="text-align:center;margin-bottom:48px"><p class="wy-eyebrow" style="justify-content:center;margin-bottom:16px">Nos formules</p><h2 class="wy-h2 wy-grad">Des tarifs clairs</h2></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px">
      <div class="wy-card wy-reveal"><h3 style="font-family:var(--wy-display);font-weight:var(--wy-dw);font-size:1.2rem;margin:0 0 6px">Essentiel</h3><div style="font-size:2rem;font-weight:700;color:var(--wy-accent);margin-bottom:14px">49€</div><p style="color:var(--wy-muted);font-size:.9rem;line-height:1.6;margin:0 0 18px">La prestation de base, parfaite pour démarrer.</p><a href="#contact" class="wy-btn-ghost" style="display:block;text-align:center">Choisir</a></div>
      <div class="wy-card wy-reveal wy-d1" style="border:2px solid var(--wy-accent)"><h3 style="font-family:var(--wy-display);font-weight:var(--wy-dw);font-size:1.2rem;margin:0 0 6px">Confort <span style="font-size:.7rem;background:var(--wy-accent);color:#fff;padding:2px 8px;border-radius:99px;vertical-align:middle">populaire</span></h3><div style="font-size:2rem;font-weight:700;color:var(--wy-accent);margin-bottom:14px">89€</div><p style="color:var(--wy-muted);font-size:.9rem;line-height:1.6;margin:0 0 18px">Le meilleur rapport qualité-prix, le plus choisi.</p><a href="#contact" class="wy-btn" style="display:block;text-align:center">Choisir</a></div>
      <div class="wy-card wy-reveal wy-d2"><h3 style="font-family:var(--wy-display);font-weight:var(--wy-dw);font-size:1.2rem;margin:0 0 6px">Premium</h3><div style="font-size:2rem;font-weight:700;color:var(--wy-accent);margin-bottom:14px">149€</div><p style="color:var(--wy-muted);font-size:.9rem;line-height:1.6;margin:0 0 18px">L'accompagnement complet, sans compromis.</p><a href="#contact" class="wy-btn-ghost" style="display:block;text-align:center">Choisir</a></div>
    </div>
  </div>
</section>`,
  },
  {
    id: "team", label: "Équipe",
    html: `
<section class="wy-section" style="background:var(--wy-bg2)">
  <div class="wy-wrap">
    <div class="wy-reveal" style="text-align:center;margin-bottom:48px"><p class="wy-eyebrow" style="justify-content:center;margin-bottom:16px">L'équipe</p><h2 class="wy-h2 wy-grad">Les visages de la maison</h2></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:22px">
      ${[["Camille", "Fondatrice"], ["Thomas", "Artisan"], ["Léa", "Conseillère"]].map((m, i) => `<div class="wy-reveal wy-d${i + 1}" style="text-align:center"><div style="width:110px;height:110px;border-radius:50%;margin:0 auto 14px;overflow:hidden;background:var(--wy-bg)"><img src="https://i.pravatar.cc/220?img=${i * 9 + 12}" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'"></div><p style="font-weight:600;margin:0">${m[0]}</p><p style="color:var(--wy-muted);font-size:.85rem;margin:2px 0 0">${m[1]}</p></div>`).join("")}
    </div>
  </div>
</section>`,
  },
  {
    id: "faq", label: "FAQ (questions)",
    html: `
<section class="wy-section" style="background:var(--wy-bg)">
  <div class="wy-wrap" style="max-width:760px">
    <div class="wy-reveal" style="text-align:center;margin-bottom:40px"><p class="wy-eyebrow" style="justify-content:center;margin-bottom:16px">Questions fréquentes</p><h2 class="wy-h2 wy-grad">On vous répond</h2></div>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${["Quels sont vos délais ?", "Proposez-vous un devis gratuit ?", "Quelle est votre zone d'intervention ?", "Comment vous contacter ?"].map((q, i) => `<details class="wy-reveal wy-d${(i % 3) + 1}" style="background:var(--wy-surface);border:1px solid color-mix(in srgb,var(--wy-ink) 9%,transparent);border-radius:14px;padding:16px 20px"><summary style="font-weight:600;cursor:pointer;list-style:none">${q}</summary><p style="color:var(--wy-muted);margin:12px 0 0;line-height:1.6">Votre réponse claire et rassurante ici — modifiable en un clic.</p></details>`).join("")}
    </div>
  </div>
</section>`,
  },
  {
    id: "hours", label: "Horaires + carte",
    html: `
<section class="wy-section" style="background:var(--wy-bg2)">
  <div class="wy-wrap"><div class="wy-grid2">
    <div class="wy-reveal">
      <p class="wy-eyebrow" style="margin-bottom:18px">Nous trouver</p>
      <h2 class="wy-h2 wy-grad">Horaires & accès</h2>
      <div style="margin-top:24px;display:flex;flex-direction:column;gap:10px">
        ${[["Lun – Ven", "9h – 19h"], ["Samedi", "9h – 13h"], ["Dimanche", "Fermé"]].map((h) => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid color-mix(in srgb,var(--wy-ink) 9%,transparent);padding-bottom:8px"><span style="font-weight:500">${h[0]}</span><span style="color:var(--wy-muted)">${h[1]}</span></div>`).join("")}
      </div>
      <p style="margin-top:22px;color:var(--wy-muted)">12 rue des Lilas, 31000 Toulouse</p>
    </div>
    <div class="wy-reveal wy-d1" style="border-radius:18px;overflow:hidden;aspect-ratio:4/3;background:var(--wy-bg)">
      <iframe src="https://www.google.com/maps?q=Toulouse&output=embed" width="100%" height="100%" style="border:0" loading="lazy"></iframe>
    </div>
  </div></div>
</section>`,
  },
  {
    id: "showcase", label: "Réalisations (projets)",
    html: `
<section class="wy-section" style="background:var(--wy-bg)">
  <div class="wy-wrap">
    <div class="wy-reveal" style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;margin-bottom:44px">
      <div><p class="wy-eyebrow" style="margin-bottom:16px">Réalisations</p><h2 class="wy-h2 wy-grad">Nos derniers projets</h2></div>
      <a href="#contact" class="wy-btn-ghost">Voir tout</a>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px">
      ${[["Boulangerie du Marché", "Site vitrine · Commande en ligne"], ["Atelier Céramique", "Portfolio · Boutique"], ["Cabinet Vittel", "Prise de rendez-vous"]].map((p, i) => `
      <a href="#contact" class="wy-card wy-reveal${i ? " wy-d" + i : ""}" style="text-decoration:none;color:inherit;padding:0;overflow:hidden;display:block">
        <div style="aspect-ratio:4/3;background:var(--wy-bg2);display:flex;align-items:center;justify-content:center;color:var(--wy-muted);font-size:.85rem;border-bottom:1px solid color-mix(in srgb,var(--wy-ink) 8%,transparent)">＋ Photo du projet</div>
        <div style="padding:20px 22px"><h3 style="margin:0 0 4px;font-weight:600;font-size:1.05rem">${p[0]}</h3><p style="margin:0;color:var(--wy-muted);font-size:.88rem">${p[1]}</p></div>
      </a>`).join("")}
    </div>
  </div>
</section>`,
  },
];

// ── Manipulation du HTML du site ────────────────────────────────────────
export function getCurrentPack(html: string): string | null {
  const m = html.match(/<body[^>]*data-wy="([^"]+)"/i);
  return m ? m[1] : null;
}

// Injecte le design-system (fonts + style + scope + motion) dans le HTML
function injectDesign(html: string, dsCss: string, dataWy: string): string {
  let out = html;
  const fontsTag = `<link id="wy-fonts" href="${WY_FONTS_HREF}" rel="stylesheet">`;
  const dsTag = `<style id="wy-ds">${dsCss}</style>`;

  if (/id="wy-fonts"/.test(out)) out = out.replace(/<link id="wy-fonts"[^>]*>/, fontsTag);
  else if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, `  ${fontsTag}\n</head>`);
  else out = fontsTag + out;

  if (/<style id="wy-ds">[\s\S]*?<\/style>/.test(out)) out = out.replace(/<style id="wy-ds">[\s\S]*?<\/style>/, dsTag);
  else if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, `  ${dsTag}\n</head>`);
  else out = dsTag + out;

  if (/<body[^>]*data-wy="/i.test(out)) out = out.replace(/(<body[^>]*data-wy=")[^"]*(")/i, `$1${dataWy}$2`);
  else if (/<body[^>]*class="/i.test(out)) out = out.replace(/<body([^>]*)class="/i, `<body$1data-wy="${dataWy}" class="wy-scope `);
  else if (/<body[^>]*>/i.test(out)) out = out.replace(/<body([^>]*)>/i, `<body$1 class="wy-scope" data-wy="${dataWy}">`);

  if (!/id="wy-reveal-js"/.test(out)) {
    if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, `${REVEAL_SCRIPT}\n</body>`);
    else out = out + REVEAL_SCRIPT;
  }
  return out;
}

export function applyPack(html: string, packId: string): string {
  return injectDesign(html, buildDsCss(packId), packId);
}

// Thème SUR-MESURE : applique des variables CSS personnalisées (palette IA)
export function applyCustomTheme(html: string, vars: string): string {
  return injectDesign(html, `${WY_COMMON}\n.wy-scope{${vars}}`, "custom");
}

// Ajoute une section générée par IA, avec un id UNIQUE (jamais de doublon),
// sans modifier le reste du site. S'assure que le design-system est présent.
export function appendCustomSection(html: string, sectionHtml: string, packId = "editorial"): string {
  const out = /id="wy-ds"/.test(html) ? html : applyPack(html, getCurrentPack(html) || packId);
  const uid = `custom-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
  const block = /data-wy-sec=/.test(sectionHtml)
    ? sectionHtml.replace(/data-wy-sec="[^"]*"/, `data-wy-sec="${uid}"`)
    : sectionHtml.replace(/<section\b/, `<section data-wy-sec="${uid}"`);
  const i = out.toLowerCase().lastIndexOf("</body>");
  return i !== -1 ? out.slice(0, i) + "\n" + block + "\n" + out.slice(i) : out + block;
}

// Construit un site COMPLET dans le style choisi (100 % design-system) →
// changer de pack ensuite re-skinne tout. Idéal pour partir d'une base.
// Remplace le jeton {{NAME}} par le nom réel de l'entreprise
export function fillName(html: string, name?: string): string {
  const n = (name || "Votre entreprise").replace(/[<>{}]/g, "").trim() || "Votre entreprise";
  return html.replace(/\{\{NAME\}\}/g, n);
}

// Tague la section avec son identifiant (mémoire / anti-doublon / suppression)
function tag(secHtml: string, id: string): string {
  return secHtml.replace(/<section\b/, `<section data-wy-sec="${id}"`);
}

// Identifiants des sections déjà présentes dans le HTML
export function getSections(html: string): string[] {
  return Array.from(html.matchAll(/data-wy-sec="([^"]+)"/g)).map((m) => m[1]);
}

// Tague les sections .wy-section non taguées (pages composées avant la mémoire)
export function ensureSectionTags(html: string): string {
  let n = 0;
  return html.replace(/<section\b([^>]*)>/gi, (full, attrs) => {
    if (/data-wy-sec=/.test(attrs) || !/wy-section/.test(attrs)) return full;
    n++;
    return `<section data-wy-sec="auto-${n}"${attrs}>`;
  });
}

// Retire une section présente (par identifiant)
export function removeSection(html: string, id: string): string {
  const re = new RegExp(`\\s*<section[^>]*data-wy-sec="${id}"[\\s\\S]*?</section>`, "i");
  return html.replace(re, "");
}

// Blocs <section data-wy-sec> dans l'ordre du document
function sectionBlocks(html: string): Array<{ id: string; text: string; start: number; end: number }> {
  const re = /<section[^>]*data-wy-sec="([^"]+)"[\s\S]*?<\/section>/gi;
  const out: Array<{ id: string; text: string; start: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push({ id: m[1], text: m[0], start: m.index, end: m.index + m[0].length });
  return out;
}

// Liste des sections dans l'ordre réel des blocs (source unique pour
// l'affichage ET les déplacements → indices toujours alignés).
export function listSections(html: string): string[] {
  return sectionBlocks(html).map((b) => b.id);
}

// Déplace la section à la POSITION `index` (dir = -1 monter, +1 descendre).
// Basé sur la position → robuste même si deux sections ont le même id.
export function moveSectionAt(html: string, index: number, dir: -1 | 1): string {
  const b = sectionBlocks(html);
  const j = index + dir;
  if (index < 0 || index >= b.length || j < 0 || j >= b.length) return html;
  const a = index < j ? b[index] : b[j]; // bloc le plus haut
  const c = index < j ? b[j] : b[index]; // bloc le plus bas
  return html.slice(0, a.start) + c.text + html.slice(a.end, c.start) + a.text + html.slice(c.end);
}

// Retire la section à la position `index`
export function removeSectionAt(html: string, index: number): string {
  const b = sectionBlocks(html);
  if (index < 0 || index >= b.length) return html;
  let start = b[index].start;
  while (start > 0 && /\s/.test(html[start - 1])) start--; // mange l'espace en amont
  return html.slice(0, start) + html.slice(b[index].end);
}

export function buildFullPage(packId: string, title = "Votre entreprise"): string {
  const order = ["hero", "services", "about", "gallery", "reviews", "cta"];
  const body = fillName(order.map((id) => tag(SECTIONS.find((s) => s.id === id)?.html || "", id)).join("\n"), title);
  const t = title.replace(/[<>]/g, "");
  return `<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t}</title>
<link id="wy-fonts" href="${WY_FONTS_HREF}" rel="stylesheet">
<style id="wy-ds">${buildDsCss(packId)}</style>
</head>
<body class="wy-scope" data-wy="${packId}" style="margin:0;background:var(--wy-bg)">
${body}
${REVEAL_SCRIPT}
</body></html>`;
}

// ── Profil métier : contenu ADAPTÉ à l'activité (rempli par l'IA studio-adapt) ──
export type StudioProfile = {
  sectorLabel?: string;                       // "Boulangerie artisanale"
  tagline?: string;                           // titre hero (peut contenir <br>)
  sub?: string;                               // accroche hero
  microStats?: string[];                      // 3-4 micro-chiffres (pills)
  services?: { title: string; desc: string }[];
  bento?: { value: string; label: string }[]; // vignettes "savoir-faire" (value = "7j/7", "1998"…)
  savoirTitle?: string;
  tools?: string[];                           // capacités / spécificités
  toolsTitle?: string;
  faq?: { q: string; a: string }[];
  cta?: string;
};

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

// Builders de sections ADAPTÉES (utilisent le profil, avec repli générique)
function secHeroP(p: StudioProfile): string {
  const tagline = p.tagline || "Votre savoir-faire,<br>sublimé en ligne.";
  const sub = esc(p.sub || "Une présence en ligne soignée, pensée pour attirer et convertir vos clients.");
  const pills = (p.microStats && p.microStats.length ? p.microStats : ["Sur-mesure", "Proximité", "Devis rapide"])
    .slice(0, 4).map((s) => `<span class="wy-statpill">${esc(s)}</span>`).join("");
  return `
<section class="wy-section" style="background:var(--wy-bg);padding-top:clamp(96px,14vw,190px)">
  <div class="wy-blobs"><span class="wy-blob b1"></span><span class="wy-blob b2"></span><span class="wy-blob b3"></span></div>
  <div class="wy-grain"></div>
  <div class="wy-wrap" style="position:relative;z-index:1;text-align:center;max-width:940px">
    <p class="wy-avail wy-reveal" style="justify-content:center;margin-bottom:24px"><i></i> ${esc(p.sectorLabel || "Disponible pour de nouveaux projets")}</p>
    <h1 class="wy-h1 wy-aurora wy-reveal wy-d1">${tagline}</h1>
    <p class="wy-lead wy-reveal wy-d2" style="max-width:600px;margin:26px auto 30px">${sub}</p>
    <div class="wy-pillrow wy-reveal wy-d2" style="margin-bottom:34px">${pills}</div>
    <div class="wy-reveal wy-d3" style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
      <a href="#contact" class="wy-btn">${esc(p.cta || "Nous contacter")}</a>
      <a href="#savoir-faire" class="wy-btn-ghost">Découvrir</a>
    </div>
  </div>
</section>`;
}

function secSavoirP(p: StudioProfile): string {
  const bento = (p.bento && p.bento.length ? p.bento : [
    { value: "100%", label: "Sur-mesure" }, { value: "Local", label: "Près de chez vous" },
    { value: "A→Z", label: "Accompagnement" }, { value: "★★★★★", label: "Satisfaction" },
  ]).slice(0, 4);
  const [big, ...rest] = bento;
  const feats = (p.services && p.services.length ? p.services.slice(0, 2) : [
    { title: "Notre approche", desc: "Un travail soigné, pensé pour durer et vous ressembler." },
    { title: "Notre engagement", desc: "Proximité, écoute et exigence à chaque étape." },
  ]);
  return `
<section class="wy-section" id="savoir-faire" style="background:var(--wy-bg2)">
  <div class="wy-wrap">
    <div class="wy-reveal" style="margin-bottom:40px"><p class="wy-eyebrow" style="margin-bottom:16px">Notre savoir-faire</p><h2 class="wy-h2 wy-grad">${esc(p.savoirTitle || "Ce qui fait la différence")}</h2></div>
    <div class="wy-bento wy-reveal wy-d1">
      <div class="wy-b-3"><p class="k">Signature</p><div class="wy-bignum"><span>${esc(big.value)}</span></div><p style="margin-top:10px">${esc(big.label)}</p></div>
      <div class="wy-b-3"><p class="k">${esc(feats[0].title)}</p><h3>${esc(feats[0].title)}</h3><p>${esc(feats[0].desc)}</p></div>
      ${rest.map((b) => `<div class="wy-b-2"><div class="wy-bignum" style="font-size:2rem"><span>${esc(b.value)}</span></div><p style="margin-top:8px;font-size:.85rem">${esc(b.label)}</p></div>`).join("")}
    </div>
  </div>
</section>`;
}

function secServicesP(p: StudioProfile): string {
  const svc = (p.services && p.services.length ? p.services : [
    { title: "Première prestation", desc: "Décrivez ici votre offre phare et ce qui la rend unique." },
    { title: "Deuxième prestation", desc: "Un service que vos clients recherchent vraiment." },
    { title: "Troisième prestation", desc: "Un atout différenciant : rapidité, garantie, proximité." },
  ]).slice(0, 6);
  return `
<section class="wy-section" id="services" style="background:var(--wy-bg)">
  <div class="wy-wrap">
    <div class="wy-reveal" style="margin-bottom:40px"><p class="wy-eyebrow" style="margin-bottom:16px">Nos prestations</p><h2 class="wy-h2 wy-grad">Ce que nous faisons</h2></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px">
      ${svc.map((s, i) => `<div class="wy-card wy-reveal${i % 3 ? " wy-d" + (i % 3) : ""}"><div class="wy-num" style="margin-bottom:14px">[0${i + 1}]</div><h3 style="font-family:var(--wy-display);font-weight:var(--wy-dw);font-size:1.15rem;margin:0 0 8px">${esc(s.title)}</h3><p style="margin:0;color:var(--wy-muted);line-height:1.55;font-size:.92rem">${esc(s.desc)}</p></div>`).join("")}
    </div>
  </div>
</section>`;
}

function secToolsP(p: StudioProfile): string {
  const tools = (p.tools && p.tools.length ? p.tools : ["Sur-mesure", "Proximité", "Réactivité", "Qualité", "Écoute", "Garantie"]).slice(0, 8);
  return `
<section class="wy-section" style="background:var(--wy-bg2)">
  <div class="wy-wrap">
    <div class="wy-reveal" style="margin-bottom:36px"><p class="wy-eyebrow" style="margin-bottom:16px">En pratique</p><h2 class="wy-h2 wy-grad">${esc(p.toolsTitle || "Nos points forts")}</h2></div>
    <div class="wy-tools wy-reveal wy-d1">
      ${tools.map((t, i) => `<div class="wy-tool"><span class="tk">${String(i + 1).padStart(2, "0")}</span><span>${esc(t)}</span></div>`).join("")}
    </div>
  </div>
</section>`;
}

function secTiersP(p: StudioProfile): string {
  const tiers = [
    { n: "Essentiel", tt: "Pour démarrer", feats: ["Prestation de base", "Accompagnement inclus", "Réponse rapide"], reco: false },
    { n: "Signature", tt: "Le plus choisi", feats: ["Tout l'Essentiel", "Prestation complète", "Suivi personnalisé", "Priorité"], reco: true },
    { n: "Sur-mesure", tt: "Projet spécifique", feats: ["Devis dédié", "Périmètre adapté", "Accompagnement premium"], reco: false },
  ];
  return `
<section class="wy-section" id="tarifs" style="background:var(--wy-bg)">
  <div class="wy-wrap">
    <div class="wy-reveal" style="text-align:center;margin-bottom:44px;max-width:620px;margin-left:auto;margin-right:auto"><p class="wy-eyebrow" style="justify-content:center;margin-bottom:16px">Nos formules</p><h2 class="wy-h2 wy-grad">Des offres claires</h2><p class="wy-lead" style="margin-top:14px">Choisissez la formule adaptée à votre besoin. Devis gratuit et sans engagement.</p></div>
    <div class="wy-tiers wy-reveal wy-d1">
      ${tiers.map((t) => `<div class="wy-tier${t.reco ? " reco" : ""}">${t.reco ? '<span class="badge">Recommandé</span>' : ""}<div class="tn">${esc(t.n)}</div><div class="tp">Sur devis</div><p class="tt">${esc(t.tt)}</p><ul>${t.feats.map((f) => `<li>${esc(f)}</li>`).join("")}</ul><a href="#contact" class="${t.reco ? "wy-btn" : "wy-btn-ghost"}" style="text-align:center">Demander un devis</a></div>`).join("")}
    </div>
  </div>
</section>`;
}

function secFaqP(p: StudioProfile): string {
  const faq = (p.faq && p.faq.length ? p.faq : [
    { q: "Comment se passe une première prise de contact ?", a: "Un échange simple pour comprendre votre besoin, sans engagement." },
    { q: "Quels sont vos délais ?", a: "Nous nous adaptons à votre projet et vous donnons un délai clair dès le départ." },
    { q: "Proposez-vous un devis gratuit ?", a: "Oui, chaque devis est gratuit et détaillé." },
  ]).slice(0, 6);
  return `
<section class="wy-section" style="background:var(--wy-bg2)">
  <div class="wy-wrap" style="max-width:760px">
    <div class="wy-reveal" style="margin-bottom:34px"><p class="wy-eyebrow" style="margin-bottom:16px">Questions fréquentes</p><h2 class="wy-h2 wy-grad">Bon à savoir</h2></div>
    <div style="display:flex;flex-direction:column;gap:14px">
      ${faq.map((f, i) => `<div class="wy-card wy-reveal${i % 3 ? " wy-d" + (i % 3) : ""}"><h3 style="margin:0 0 6px;font-size:1.02rem;font-weight:600">${esc(f.q)}</h3><p style="margin:0;color:var(--wy-muted);line-height:1.55">${esc(f.a)}</p></div>`).join("")}
    </div>
  </div>
</section>`;
}

// Modèle complet "Studio" premium, avec contenu ADAPTÉ au métier via `profile`.
// `variant` = pack ('artefact' clair, 'carbon' sombre). Remplace toute la page.
export function buildStudioTemplate(title = "Votre entreprise", variant: "artefact" | "carbon" = "artefact", profile: StudioProfile = {}): string {
  const marquee = SECTIONS.find((s) => s.id === "marquee")?.html || "";
  const reviews = SECTIONS.find((s) => s.id === "reviews")?.html || "";
  const cta = SECTIONS.find((s) => s.id === "cta")?.html || "";
  const parts = [
    tag(secHeroP(profile), "hero-aurora"),
    tag(marquee, "marquee"),
    tag(secSavoirP(profile), "savoir-faire"),
    tag(secServicesP(profile), "services"),
    tag(secToolsP(profile), "tools"),
    tag(secTiersP(profile), "tarifs"),
    tag(reviews, "reviews"),
    tag(secFaqP(profile), "faq"),
    tag(cta, "cta"),
  ];
  const body = fillName(parts.join("\n"), title);
  const t = title.replace(/[<>]/g, "");
  return `<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t}</title>
<link id="wy-fonts" href="${WY_FONTS_HREF}" rel="stylesheet">
<style id="wy-ds">${buildDsCss(variant)}</style>
</head>
<body class="wy-scope" data-wy="${variant}" style="margin:0;background:var(--wy-bg)">
${body}
${REVEAL_SCRIPT}
</body></html>`;
}

export function insertSection(html: string, sectionId: string, packId = "editorial", name?: string): string {
  const sec = SECTIONS.find((s) => s.id === sectionId);
  if (!sec) return html;
  // Anti-doublon : une même section ne s'ajoute qu'une fois
  if (getSections(html).includes(sectionId)) return html;
  // S'assure que le design-system est présent
  const out = /id="wy-ds"/.test(html) ? html : applyPack(html, getCurrentPack(html) || packId);
  const block = tag(fillName(sec.html, name), sectionId);
  const i = out.toLowerCase().lastIndexOf("</body>");
  return i !== -1 ? out.slice(0, i) + block + "\n" + out.slice(i) : out + block;
}
