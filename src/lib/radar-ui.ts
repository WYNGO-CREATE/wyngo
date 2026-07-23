// ─── Le Radar Tech — chartes & helpers du média public ────────────────
// Design inspiré de la presse (Le Monde) : serif Spectral (titres/corps) +
// sans Libre Franklin (interface). Styles scopés sous .radar pour ne pas
// entrer en conflit avec l'app CRM.

export const RADAR_FONTS =
  "https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Libre+Franklin:wght@400;500;600;700;800&display=swap";

export const CATEGORIES: { id: string; label: string }[] = [
  { id: "tech", label: "Tech" },
  { id: "outils", label: "Outils" },
  { id: "ia", label: "Intelligence artificielle" },
  { id: "medias", label: "Médias" },
  { id: "internet", label: "Internet" },
  { id: "enquetes", label: "Enquêtes" },
];
export const catLabel = (id?: string | null) => CATEGORIES.find((c) => c.id === id)?.label || "Tech";

export const dateFr = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";

export const RADAR_CSS = `
.radar{--ink:#12100e;--mut:#5c5852;--line:#e3e0d8;--bg:#faf8f3;--paper:#fff;--accent:#9a2a2a;--blue:#1c3f7c;
  background:var(--bg);color:var(--ink);font-family:'Libre Franklin',system-ui,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased}
.radar a{color:inherit;text-decoration:none}
.radar .serif{font-family:'Spectral',Georgia,serif}
.radar .wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.radar .util{border-bottom:1px solid var(--line);font-size:12px}
.radar .util .wrap{display:flex;align-items:center;justify-content:space-between;height:38px}
.radar .util .date{color:var(--mut);text-transform:capitalize}
.radar .util .acts{display:flex;align-items:center;gap:16px}
.radar .util .acts a{color:var(--mut);font-weight:500}
.radar .util .login{border:1px solid var(--ink);padding:6px 14px;border-radius:2px;color:var(--ink);font-weight:600}
.radar .mast{text-align:center;padding:22px 0 14px;border-bottom:1px solid var(--ink)}
.radar .logo{font-family:'Spectral',serif;font-weight:800;font-size:clamp(34px,6vw,62px);letter-spacing:-.02em;line-height:1;display:inline-block}
.radar .logo b{color:var(--accent)}
.radar .mast .tag{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--mut);margin-top:8px}
.radar nav.rub{border-bottom:1px solid var(--ink);position:sticky;top:0;background:var(--bg);z-index:10}
.radar nav.rub .wrap{display:flex;gap:24px;justify-content:center;height:44px;align-items:center;overflow:auto}
.radar nav.rub a{font-size:13px;font-weight:600;white-space:nowrap;padding:4px 0;border-bottom:2px solid transparent}
.radar nav.rub a:hover,.radar nav.rub a.on{border-color:var(--accent);color:var(--accent)}
.radar .kick{font-size:11.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);display:inline-block}
.radar .lead{display:grid;grid-template-columns:1.4fr 1fr;gap:38px;padding:34px 0;border-bottom:1px solid var(--line)}
.radar .lead h1{font-family:'Spectral',serif;font-weight:800;font-size:clamp(30px,4.4vw,50px);line-height:1.05;letter-spacing:-.015em;margin:12px 0 14px}
.radar .lead h1 a:hover{color:var(--accent)}
.radar .lead .sf{font-family:'Spectral',serif;font-size:19px;line-height:1.5;color:#2c2823;margin:0 0 14px}
.radar .by{font-size:12.5px;color:var(--mut)}
.radar .img{background:#e9e5db;border-radius:3px;display:flex;align-items:center;justify-content:center;color:#a9a396;font-size:12px;overflow:hidden}
.radar .img img{width:100%;height:100%;object-fit:cover}
.radar .lead .img{aspect-ratio:4/3}
.radar .two{display:grid;grid-template-columns:1fr 320px;gap:38px;align-items:start;padding-bottom:40px}
.radar .grid{display:grid;grid-template-columns:repeat(2,1fr)}
.radar .card{padding:24px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}
.radar .card:nth-child(2n){border-right:none}
.radar .card .img{aspect-ratio:16/10;margin-bottom:12px}
.radar .card h2{font-family:'Spectral',serif;font-weight:700;font-size:20px;line-height:1.14;margin:8px 0}
.radar .card h2 a:hover{color:var(--accent)}
.radar .card p{font-size:14px;line-height:1.5;color:var(--mut);margin:0 0 10px}
.radar .rail{background:var(--paper);border:1px solid var(--line);border-radius:3px;padding:22px;position:sticky;top:60px}
.radar .rail .lbl{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);border-bottom:1px solid var(--line);padding-bottom:10px;margin-bottom:14px}
.radar .rail h3{font-family:'Spectral',serif;font-size:18px;line-height:1.22;margin:0 0 8px}
.radar .rail p{font-size:13.5px;line-height:1.5;color:var(--mut);margin:0 0 12px}
.radar .rail a.more{font-size:13px;font-weight:600;color:var(--blue)}
.radar footer{border-top:2px solid var(--ink);margin-top:10px;padding:28px 0;font-size:13px;color:var(--mut)}
.radar footer .wrap{display:flex;justify-content:space-between;flex-wrap:wrap;gap:14px}
/* Page article */
.radar .art{max-width:720px;margin:0 auto;padding:34px 24px 60px}
.radar .art h1{font-family:'Spectral',serif;font-weight:800;font-size:clamp(28px,4.4vw,46px);line-height:1.06;letter-spacing:-.015em;margin:14px 0 16px}
.radar .art .sf{font-family:'Spectral',serif;font-size:20px;line-height:1.5;color:#2c2823;margin:0 0 20px;font-weight:500}
.radar .art .meta{font-size:13px;color:var(--mut);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:12px 0;margin-bottom:24px}
.radar .art .cover{width:100%;aspect-ratio:16/9;border-radius:3px;margin-bottom:24px}
.radar .art .content{font-family:'Spectral',serif;font-size:19px;line-height:1.72;color:#1c1a17}
.radar .art .content p{margin:0 0 20px}
.radar .art .content a{color:var(--blue);text-decoration:underline;text-underline-offset:2px}
.radar .art .content h2{font-family:'Spectral',serif;font-size:26px;margin:34px 0 12px}
.radar .backlink{font-size:13px;font-weight:600;color:var(--accent)}
@media(max-width:820px){.radar .lead,.radar .two,.radar .grid{grid-template-columns:1fr}.radar .card{border-right:none}}
`;
