// ─── Portail client (public) ───────────────────────────────────────────
//
//  GET  ?token=<portal_token>  → page de suivi du projet : avancement,
//        maquette, devis à signer, fil de messages avec l'agence.
//  POST { token, action }
//        action=message   { body }  → le client écrit à l'agence
//        action=validate           → le client valide sa maquette
//
//  Servie en clair via le Worker Cloudflare (/portail/<token>).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const dateFr = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";
const timeFr = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

// Base publique servant les sites (/p/<slug>) via le Worker Cloudflare.
const PUBLIC_BASE = "https://wyngoworkspace.bold-unit-739e.workers.dev";

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}

function liveUrlFor(site: any): string | null {
  // Lien live uniquement quand le site a réellement été mis en ligne
  // (html_path posé par site-publish) — pas juste marqué "publié".
  return site.status === "published" && site.slug && site.html_path ? `${PUBLIC_BASE}/p/${site.slug}` : null;
}

// Empreinte de l'avancement : si elle change, le portail se recharge.
async function stateKey(db: any, site: any): Promise<string> {
  const { count } = await db.from("portal_messages").select("id", { count: "exact", head: true }).eq("site_id", site.id);
  return [site.production_stage || "brief", site.maquette_validated_at ? 1 : 0, liveUrlFor(site) ? 1 : 0, count || 0].join("|");
}

const STAGES = [
  { key: "brief", label: "Préparation", desc: "On rassemble les infos de votre projet." },
  { key: "design", label: "Création", desc: "Votre site prend forme." },
  { key: "review", label: "Votre validation", desc: "À vous de valider la maquette." },
  { key: "live", label: "En ligne", desc: "Votre site est publié." },
  { key: "care", label: "Suivi", desc: "On veille et on améliore en continu." },
];

function renderPage(ctx: {
  site: any; clientName: string; maquetteUrl: string | null; liveUrl: string | null;
  devisToken: string | null; messages: any[]; agencyName: string; state: string;
}): string {
  const { site, clientName, maquetteUrl, liveUrl, devisToken, messages, agencyName, state } = ctx;
  const stageIdx = Math.max(0, STAGES.findIndex((s) => s.key === (site.production_stage || "brief")));
  const validated = !!site.maquette_validated_at;

  const steps = STAGES.map((st, i) => {
    const done = i < stageIdx;
    const active = i === stageIdx;
    const cls = done ? "done" : active ? "active" : "todo";
    return `<div class="step ${cls}">
      <div class="dot">${done ? "✓" : i + 1}</div>
      <div class="stxt"><div class="sl">${esc(st.label)}</div><div class="sd">${esc(st.desc)}</div></div>
    </div>`;
  }).join("");

  // Bloc site : en ligne → on montre le vrai site ; sinon la maquette.
  const previewSrc = liveUrl || maquetteUrl;
  const maquetteBlock = liveUrl ? `
    <div class="card">
      <h3>🎉 Votre site est en ligne !</h3>
      <p class="muted">Félicitations, votre site est désormais accessible publiquement.</p>
      <a class="frameLink" href="${esc(liveUrl)}" target="_blank" rel="noreferrer">
        <iframe src="${esc(liveUrl)}" loading="lazy" title="Votre site en ligne"></iframe>
        <span class="frameOpen">Voir en plein écran ↗</span>
      </a>
      <a class="btn ok" href="${esc(liveUrl)}" target="_blank" rel="noreferrer">Voir mon site en ligne →</a>
    </div>` : previewSrc ? `
    <div class="card">
      <h3>Votre maquette</h3>
      <p class="muted">Voici l'aperçu de votre futur site. Cliquez pour l'explorer en grand.</p>
      <a class="frameLink" href="${esc(previewSrc)}" target="_blank" rel="noreferrer">
        <iframe src="${esc(previewSrc)}" loading="lazy" title="Maquette"></iframe>
        <span class="frameOpen">Ouvrir en plein écran ↗</span>
      </a>
      ${site.production_stage === "review" && !validated ? `
        <button id="validateBtn" class="btn ok">👍 Je valide cette maquette</button>
        <p class="err" id="vErr"></p>` :
      validated ? `<div class="state ok">✓ Vous avez validé cette maquette le ${dateFr(site.maquette_validated_at)}. Merci !</div>` : ""}
    </div>` : "";

  // Devis à signer
  const devisBlock = devisToken ? `
    <div class="card">
      <h3>Votre devis</h3>
      <p class="muted">Consultez et signez votre devis en ligne en deux clics.</p>
      <a class="btn" href="/devis/${esc(devisToken)}" target="_blank" rel="noreferrer">Voir &amp; signer le devis →</a>
    </div>` : "";

  const msgHtml = messages.length
    ? messages.map((mm) => `
      <div class="msg ${mm.author === "client" ? "me" : "them"}">
        <div class="bubble">${esc(mm.body)}</div>
        <div class="meta">${mm.author === "client" ? "Vous" : esc(agencyName)} · ${timeFr(mm.created_at)}</div>
      </div>`).join("")
    : `<p class="muted" style="text-align:center;padding:12px">Aucun message pour l'instant. Écrivez-nous, on répond vite !</p>`;

  return `<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Votre projet — ${esc(agencyName)}</title>
<style>
  *{box-sizing:border-box} html,body{margin:0}
  body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#0f172a;background:#f1f5f9;font-size:14px;line-height:1.55}
  .wrap{max-width:680px;margin:0 auto;padding:20px 16px 60px}
  .hero{background:linear-gradient(135deg,#1B4BE3,#3b5bdb);color:#fff;border-radius:18px;padding:26px 28px;margin-bottom:18px}
  .hero .logo{background:#fff;width:64px;height:64px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:14px;box-shadow:0 6px 18px rgba(0,0,0,.18)}
  .hero .badge{display:inline-block;background:rgba(255,255,255,.18);padding:3px 10px;border-radius:99px;font-size:11px;font-weight:600;margin-bottom:10px}
  .hero h1{margin:0 0 4px;font-size:24px}
  .hero p{margin:0;opacity:.9;font-size:13px}
  .card{background:#fff;border-radius:16px;box-shadow:0 4px 20px rgba(15,23,42,.06);padding:22px 24px;margin-bottom:16px}
  .card h3{margin:0 0 4px;font-size:17px}
  .muted{color:#64748b;font-size:12.5px}
  .steps{display:flex;flex-direction:column;gap:2px;margin-top:8px}
  .step{display:flex;gap:14px;align-items:flex-start;position:relative;padding-bottom:16px}
  .step:not(:last-child)::before{content:"";position:absolute;left:15px;top:30px;bottom:0;width:2px;background:#e2e8f0}
  .step.done:not(:last-child)::before{background:#22c55e}
  .dot{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;z-index:1}
  .step.todo .dot{background:#e2e8f0;color:#94a3b8}
  .step.done .dot{background:#22c55e;color:#fff}
  .step.active .dot{background:#1B4BE3;color:#fff;box-shadow:0 0 0 4px rgba(27,75,227,.18)}
  .sl{font-weight:700}
  .step.todo .sl{color:#94a3b8} .step.todo .sd{color:#cbd5e1}
  .sd{font-size:12px;color:#64748b}
  .frameLink{display:block;position:relative;margin-top:12px;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;text-decoration:none}
  .frameLink iframe{width:100%;height:300px;border:0;pointer-events:none;background:#fff;transform:scale(1);transform-origin:top left}
  .frameOpen{position:absolute;bottom:10px;right:10px;background:rgba(15,23,42,.85);color:#fff;font-size:11px;padding:5px 10px;border-radius:8px}
  .btn{display:inline-block;width:100%;text-align:center;background:#1B4BE3;color:#fff;border:0;padding:13px;border-radius:11px;font-size:14px;font-weight:700;cursor:pointer;text-decoration:none;margin-top:12px;transition:.15s}
  .btn:hover{background:#1740c0} .btn.ok{background:#16a34a} .btn.ok:hover{background:#15803d} .btn:disabled{opacity:.6;cursor:not-allowed}
  .state{margin-top:12px;padding:12px 14px;border-radius:11px;font-weight:600;font-size:13px}
  .state.ok{background:#ecfdf5;color:#047857;border:1px solid #a7f3d0}
  .err{color:#dc2626;font-size:12.5px;margin:8px 0 0;min-height:1px}
  .thread{display:flex;flex-direction:column;gap:10px;margin:12px 0}
  .msg{display:flex;flex-direction:column;max-width:82%}
  .msg.me{align-self:flex-end;align-items:flex-end}
  .msg.them{align-self:flex-start}
  .bubble{padding:9px 13px;border-radius:14px;font-size:13.5px}
  .msg.me .bubble{background:#1B4BE3;color:#fff;border-bottom-right-radius:4px}
  .msg.them .bubble{background:#f1f5f9;color:#0f172a;border-bottom-left-radius:4px}
  .meta{font-size:10px;color:#94a3b8;margin-top:3px}
  .composer{display:flex;gap:8px;margin-top:8px}
  .composer textarea{flex:1;border:1px solid #cbd5e1;border-radius:11px;padding:10px 12px;font-size:13.5px;resize:none;font-family:inherit}
  .composer textarea:focus{outline:none;border-color:#1B4BE3;box-shadow:0 0 0 3px rgba(27,75,227,.14)}
  .composer button{background:#1B4BE3;color:#fff;border:0;border-radius:11px;padding:0 16px;font-weight:700;cursor:pointer}
  .foot{text-align:center;color:#94a3b8;font-size:11px;margin-top:18px}
</style></head>
<body><div class="wrap">
  <div class="hero">
    <div class="logo">
      <svg viewBox="0 0 100 100" width="48" height="48" xmlns="http://www.w3.org/2000/svg" aria-label="Group Arsène">
        <rect width="100" height="100" rx="24" fill="#0a0a0a"/>
        <text x="50" y="64" font-family="Georgia,'Times New Roman',serif" font-size="56" font-weight="700" fill="#F1EDE0" text-anchor="middle">W</text>
        <rect x="37" y="78" width="26" height="5" rx="2.5" fill="#1B4BE3"/>
      </svg>
    </div>
    <span class="badge">Espace client · ${esc(agencyName)}</span>
    <h1>Bonjour ${esc(clientName)} 👋</h1>
    <p>Suivez l'avancement de votre site en temps réel, validez votre maquette et échangez avec nous, le tout au même endroit.</p>
  </div>

  <div class="card">
    <h3>Avancement de votre projet</h3>
    <div class="steps">${steps}</div>
  </div>

  ${maquetteBlock}
  ${devisBlock}

  <div class="card">
    <h3>Échanger avec l'équipe</h3>
    <div class="thread" id="thread">${msgHtml}</div>
    <div class="composer">
      <textarea id="msg" rows="2" placeholder="Votre message…"></textarea>
      <button id="sendBtn">Envoyer</button>
    </div>
    <p class="err" id="mErr"></p>
  </div>

  <div class="foot">Espace sécurisé propulsé par Group Arsène</div>
</div>
<script>
  var token = ${JSON.stringify(site.portal_token)};
  function post(action, extra, onok){
    var body = Object.assign({token:token, action:action}, extra||{});
    return fetch(window.location.pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){return r.json()})
      .then(function(d){ if(d.ok){ onok&&onok(d);} else { throw new Error(d.error||'Erreur'); } });
  }
  var vb = document.getElementById('validateBtn');
  if(vb) vb.onclick=function(){ vb.disabled=true; post('validate',{},function(){location.reload();})
    .catch(function(e){ document.getElementById('vErr').textContent=e.message; vb.disabled=false; }); };
  var sb = document.getElementById('sendBtn');
  if(sb) sb.onclick=function(){
    var ta=document.getElementById('msg'); var t=(ta.value||'').trim();
    if(!t){ return; } sb.disabled=true;
    post('message',{body:t},function(){location.reload();})
      .catch(function(e){ document.getElementById('mErr').textContent=e.message; sb.disabled=false; });
  };
  // Mise à jour live : on recharge si l'avancement change (sauf si le client écrit).
  var currentState = ${JSON.stringify(state)};
  setInterval(function(){
    var ta=document.getElementById('msg');
    if(ta && (document.activeElement===ta || (ta.value||'').trim())) return;
    post('state',{},function(d){ if(d.state && d.state!==currentState){ location.reload(); } })
      .catch(function(){});
  }, 20000);
</script>
</body></html>`;
}


/** L'identité de l'agence = celle de l'administrateur. Depuis que chaque
 *  membre a sa propre fiche de facturation, prendre « la première ligne »
 *  reviendrait à signer au nom d'un collaborateur. */
async function identiteAgence(db: any) {
  const { data: adm } = await db.from("user_roles").select("user_id")
    .eq("role", "admin").order("created_at").limit(1).maybeSingle();
  if (!adm?.user_id) return null;
  const { data } = await db.from("billing_settings").select("*")
    .eq("owner_id", adm.user_id).maybeSingle();
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = new URL(req.url);
  const db = admin();

  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const token = body.token;
      const action = body.action;
      if (!token) return json({ ok: false, error: "Lien invalide." }, 400);

      const { data: site } = await db.from("client_sites").select("*").eq("portal_token", token).maybeSingle();
      if (!site) return json({ ok: false, error: "Projet introuvable." }, 404);

      if (action === "message") {
        const text = String(body.body || "").trim().slice(0, 2000);
        if (!text) return json({ ok: false, error: "Message vide." }, 400);
        await db.from("portal_messages").insert({
          site_id: site.id, owner_id: site.owner_id, author: "client", body: text, read_by_agency: false,
        });
        return json({ ok: true });
      }

      if (action === "state") {
        return json({ ok: true, state: await stateKey(db, site) });
      }

      if (action === "validate") {
        if (!site.maquette_validated_at) {
          await db.from("client_sites").update({ maquette_validated_at: new Date().toISOString() }).eq("id", site.id);
          await db.from("portal_messages").insert({
            site_id: site.id, owner_id: site.owner_id, author: "client",
            body: "✅ J'ai validé la maquette.", read_by_agency: false,
          });
        }
        return json({ ok: true });
      }

      return json({ ok: false, error: "Action inconnue." }, 400);
    }

    // GET : rendu
    const token = url.searchParams.get("token");
    if (!token) return html("<h1>Lien invalide</h1>", 400);

    const { data: site } = await db.from("client_sites").select("*").eq("portal_token", token).maybeSingle();
    if (!site) return html(`<div style="font-family:sans-serif;text-align:center;padding:60px">
      <h1 style="font-size:22px">Projet introuvable</h1>
      <p style="color:#64748b">Ce lien n'est plus valide.</p></div>`, 404);

    // Nom du client (prospect)
    const { data: prospect } = await db.from("prospects")
      .select("first_name, last_name, company, email").eq("id", site.prospect_id).maybeSingle();
    const clientName = prospect?.company || `${prospect?.first_name || ""} ${prospect?.last_name || ""}`.trim() || "cher client";

    // Maquette la plus récente
    const { data: prev } = await db.from("prospect_previews")
      .select("slug, html_url").eq("prospect_id", site.prospect_id)
      .order("generated_at", { ascending: false }).limit(1).maybeSingle();
    const maquetteUrl = prev?.html_url || (prev?.slug ? `${url.origin}/p/${prev.slug}` : null);

    // Devis le plus récent (envoyé/accepté) à montrer
    const { data: devis } = await db.from("documents")
      .select("share_token, status").eq("prospect_id", site.prospect_id).eq("type", "devis")
      .in("status", ["envoye", "accepte"]).order("created_at", { ascending: false }).limit(1).maybeSingle();

    // Messages
    const { data: messages } = await db.from("portal_messages")
      .select("author, body, created_at").eq("site_id", site.id).order("created_at", { ascending: true });

    // Nom de l'agence (réglages facturation, sinon "Group Arsène")
    const settings = await identiteAgence(db);
    const agencyName = settings?.trade_name || settings?.legal_name || "Group Arsène";

    return html(renderPage({
      site, clientName, maquetteUrl, liveUrl: liveUrlFor(site),
      devisToken: devis?.share_token || null,
      messages: messages || [], agencyName,
      state: await stateKey(db, site),
    }));
  } catch (e) {
    console.error("client-portal error", e);
    return html(`<div style="font-family:sans-serif;text-align:center;padding:60px"><h1>Erreur</h1></div>`, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json" } });
}
function html(body: string, status = 200) {
  return new Response(body, { status, headers: { ...cors, "content-type": "text/html; charset=utf-8" } });
}
