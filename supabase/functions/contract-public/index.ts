// ─── Contrat public — page de signature en ligne ──────────────────────
//
//  GET  ?token=<share_token>  → page HTML : le contrat (corps gelé) + panneau
//                               « Lu et approuvé — Signer ». Marque « vu ».
//  POST { token, action, signer_name }
//        action=sign   → contrat « signé », horodaté + signataire + IP.
//        action=refuse → contrat « refusé ».
//
//  Servie via le Worker Cloudflare (/contrat/<token>). Le corps est le
//  snapshot figé dans contracts.body — on ne régénère rien (valeur probante).

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
const dateFr = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
}

type Section = { h: string; p: string[] };

function renderPage(ct: any, s: any): string {
  const body = ct.body || {};
  const sections: Section[] = Array.isArray(body.sections) ? body.sections : [];
  const signed = ct.status === "signe";
  const refused = ct.status === "refuse";
  const closed = signed || refused;

  const secHtml = sections.map((sec) =>
    `<section class="clause"><h2>${esc(sec.h)}</h2>${(sec.p || []).map((x) => `<p>${esc(x)}</p>`).join("")}</section>`,
  ).join("");

  const banner = signed
    ? `<div class="state ok">✓ Contrat signé le ${dateFr(ct.signed_at)}${ct.signed_by_name ? ` par <b>${esc(ct.signed_by_name)}</b>` : ""}. Un exemplaire vous a été transmis.</div>`
    : refused ? `<div class="state ko">Ce contrat a été décliné.</div>` : "";

  const signPanel = closed ? "" : `
    <div class="sign" id="signCard">
      <h3>Lu et approuvé — Signature</h3>
      <p class="muted">En signant, vous reconnaissez avoir lu l'ensemble des clauses ci-dessus et les accepter sans réserve.</p>
      <label class="lbl">Vos nom et prénom</label>
      <input id="name" type="text" placeholder="Ex : Marie Dupont" autocomplete="name" />
      <label class="chk"><input id="agree" type="checkbox" /> <span>« Lu et approuvé » — j'accepte les termes de ce contrat.</span></label>
      <button id="signBtn" class="btn">Signer le contrat</button>
      <button id="refuseBtn" class="link">Je ne souhaite pas donner suite</button>
      <p class="err" id="err"></p>
    </div>`;

  return `<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(body.title || "Contrat")} — ${esc(s?.trade_name || s?.legal_name || "Group Arsène")}</title>
<style>
  *{box-sizing:border-box}html,body{margin:0}
  body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#0f172a;background:#f1f5f9;font-size:14px;line-height:1.6}
  .wrap{max-width:800px;margin:0 auto;padding:20px 16px 60px}
  .doc{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(15,23,42,.08);overflow:hidden}
  .head{padding:28px 34px;border-bottom:1px solid #eef1f5}
  .brand{font-weight:800;font-size:17px}.sub{color:#475569;font-size:12px;margin-top:1px}
  h1.ttl{font-size:23px;margin:14px 0 0;letter-spacing:-.01em}
  .n{color:#64748b;font-size:12px;margin-top:3px}
  .body{padding:22px 34px}
  .clause{margin:0 0 16px}
  .clause h2{font-size:14px;text-transform:uppercase;letter-spacing:.04em;color:#0f172a;margin:0 0 6px;border-left:3px solid #4f46e5;padding-left:9px}
  .clause p{margin:0 0 7px;color:#334155;text-align:justify}
  .state{margin:18px 0 0;padding:14px 16px;border-radius:12px;font-weight:600}
  .state.ok{background:#ecfdf5;color:#047857;border:1px solid #a7f3d0}
  .state.ko{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
  .sign{margin:22px 0 0;padding:22px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc}
  .sign h3{margin:0 0 4px;font-size:18px}.sign .muted{color:#64748b;font-size:12.5px;margin:0 0 14px}
  .lbl{display:block;font-size:12px;font-weight:600;margin:0 0 5px}
  #name{width:100%;padding:12px 14px;border:1px solid #cbd5e1;border-radius:10px;font-size:15px;margin-bottom:12px}
  #name:focus{outline:none;border-color:#4f46e5;box-shadow:0 0 0 3px rgba(79,70,229,.15)}
  .chk{display:flex;align-items:flex-start;gap:9px;font-size:13px;margin-bottom:16px;cursor:pointer}
  .chk input{margin-top:2px;width:16px;height:16px}
  .btn{width:100%;background:#4f46e5;color:#fff;border:0;padding:14px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer}
  .btn:hover{background:#4338ca}.btn:disabled{opacity:.6;cursor:not-allowed}
  .link{display:block;width:100%;background:none;border:0;color:#94a3b8;font-size:12.5px;margin-top:12px;cursor:pointer;text-decoration:underline}
  .err{color:#dc2626;font-size:13px;margin:10px 0 0;min-height:1px}
  .disc{margin-top:18px;font-size:11px;color:#94a3b8;border-top:1px solid #eef1f5;padding-top:12px}
  .foot{text-align:center;color:#94a3b8;font-size:11px;margin-top:22px}
</style></head>
<body><div class="wrap">
  <div class="doc">
    <div class="head">
      <div class="brand">${esc(s?.trade_name || s?.legal_name || "Group Arsène")}</div>
      ${s?.siret ? `<div class="sub">SIRET : ${esc(s.siret)}</div>` : ""}
      <h1 class="ttl">${esc(body.title || "Contrat de prestation")}</h1>
      <div class="n">${ct.number ? "Réf. " + esc(ct.number) + " · " : ""}Établi le ${dateFr(ct.created_at)}</div>
    </div>
    <div class="body">
      ${secHtml || `<p class="muted">Contenu indisponible.</p>`}
      ${banner}
      ${signPanel}
      <div class="disc">${esc(body.disclaimer || "")}</div>
    </div>
  </div>
  <div class="foot">Contrat transmis via Group Arsène · signature électronique horodatée (eIDAS)</div>
</div>
<script>
  var token=${JSON.stringify(ct.share_token)};
  var btn=document.getElementById('signBtn'),refuse=document.getElementById('refuseBtn'),err=document.getElementById('err');
  function post(action){
    var name=(document.getElementById('name')||{}).value||'';
    if(action==='sign'){
      if(!name.trim()){err.textContent='Indiquez votre nom pour signer.';return;}
      if(!document.getElementById('agree').checked){err.textContent='Cochez « Lu et approuvé ».';return;}
    }
    err.textContent='';if(btn){btn.disabled=true;btn.textContent='Signature…';}
    fetch(window.location.pathname,{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({token:token,action:action,signer_name:name})})
      .then(function(r){return r.json()})
      .then(function(d){if(d.ok){location.reload();}else{err.textContent=d.error||'Erreur, réessayez.';if(btn){btn.disabled=false;btn.textContent='Signer le contrat';}}})
      .catch(function(){err.textContent='Erreur réseau, réessayez.';if(btn){btn.disabled=false;btn.textContent='Signer le contrat';}});
  }
  if(btn)btn.onclick=function(){post('sign')};
  if(refuse)refuse.onclick=function(){if(confirm('Confirmer le refus de ce contrat ?'))post('refuse');};
</script>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = new URL(req.url);
  const db = admin();
  try {
    if (req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      const token = b.token, action = b.action;
      if (!token) return json({ ok: false, error: "Lien invalide." }, 400);
      const { data: ct } = await db.from("contracts").select("*").eq("share_token", token).maybeSingle();
      if (!ct) return json({ ok: false, error: "Contrat introuvable." }, 404);
      if (ct.status === "signe") return json({ ok: false, error: "Ce contrat est déjà signé." }, 409);
      if (ct.status === "refuse") return json({ ok: false, error: "Ce contrat a déjà été décliné." }, 409);
      const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || null;

      if (action === "refuse") {
        await db.from("contracts").update({ status: "refuse", refused_at: new Date().toISOString() }).eq("id", ct.id);
        return json({ ok: true });
      }
      const signer = String(b.signer_name || "").trim().slice(0, 120);
      if (!signer) return json({ ok: false, error: "Nom requis." }, 400);
      await db.from("contracts").update({
        status: "signe", signed_at: new Date().toISOString(), signed_by_name: signer, signer_ip: ip,
      }).eq("id", ct.id);
      if (ct.prospect_id) {
        await db.from("prospect_events").insert({
          owner_id: ct.owner_id, prospect_id: ct.prospect_id, event_type: "contrat_signe",
          payload: { contract_id: ct.id, number: ct.number, kind: ct.kind, signer },
        }).then(() => {}, () => {});
      }
      return json({ ok: true });
    }

    const token = url.searchParams.get("token");
    if (!token) return html("<h1>Lien invalide</h1>", 400);
    const { data: ct } = await db.from("contracts").select("*").eq("share_token", token).maybeSingle();
    if (!ct) return html(`<div style="font-family:sans-serif;text-align:center;padding:60px"><h1>Contrat introuvable</h1><p style="color:#64748b">Ce lien n'est plus valide.</p></div>`, 404);
    if (ct.status === "brouillon") return html(`<div style="font-family:sans-serif;text-align:center;padding:60px"><h1>Contrat indisponible</h1><p style="color:#64748b">Ce contrat n'a pas encore été envoyé.</p></div>`, 403);
    if (!ct.viewed_at && ct.status === "envoye") await db.from("contracts").update({ viewed_at: new Date().toISOString() }).eq("id", ct.id);
    const { data: settings } = await db.from("billing_settings").select("*").eq("owner_id", ct.owner_id).maybeSingle();
    return html(renderPage(ct, settings || {}));
  } catch (e) {
    console.error("contract-public error", e);
    return html(`<div style="font-family:sans-serif;text-align:center;padding:60px"><h1>Erreur</h1></div>`, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json" } });
}
function html(body: string, status = 200) {
  return new Response(body, { status, headers: { ...cors, "content-type": "text/html; charset=utf-8" } });
}
