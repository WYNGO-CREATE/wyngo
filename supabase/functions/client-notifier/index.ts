/**
 * ─── Prévenir le client qu'on lui a répondu ───────────────────────────
 *
 * Sans ça, le client devait rouvrir son espace « au cas où » pour savoir si
 * l'agence avait répondu. Autant dire qu'il ne le faisait pas, et qu'une
 * réponse pouvait dormir une semaine.
 *
 * Appelée par un déclencheur en base, pas par l'interface : l'email part donc
 * quel que soit l'endroit d'où la réponse a été écrite, aujourd'hui comme
 * demain.
 *
 * L'email ne reprend PAS le contenu du message. Une boîte mail se transfère,
 * s'imprime, se laisse ouverte sur un bureau — et une réponse d'agence peut
 * contenir un prix, un délai, un reproche. On dit qu'il y a une réponse, et
 * on renvoie vers l'espace.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: SRV, Authorization: `Bearer ${SRV}`, "Content-Type": "application/json" };

/** Trace de chaque tentative : sans ça, « il n'a rien reçu » est indébogable. */
async function consigner(site_id: string, envoye: boolean, raison: string | null, destinataire?: string) {
  try {
    await fetch(`${URL_SB}/rest/v1/notifications_journal`, {
      method: "POST",
      headers: { ...H, Prefer: "return=minimal" },
      body: JSON.stringify({ site_id, envoye, raison, destinataire: destinataire ?? null }),
    });
  } catch { /* le journal ne doit jamais casser l'envoi */ }
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function courriel(prenom: string | null, titre: string, lien: string) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 4px 22px rgba(15,23,42,.07)">
  <tr><td style="padding:24px 28px 16px;border-bottom:1px solid #eef2f7">
    <table role="presentation"><tr>
      <td><div style="width:32px;height:32px;line-height:32px;text-align:center;border-radius:9px;background:#0f172a;color:#fff;font-weight:700">A</div></td>
      <td style="padding-left:10px">
        <div style="font-weight:700;letter-spacing:.5px;font-size:13px;color:#0f172a">GROUP ARSÈNE</div>
        <div style="font-size:10px;letter-spacing:2px;color:#94a3b8;text-transform:uppercase">Espace client</div>
      </td></tr></table>
  </td></tr>
  <tr><td style="padding:26px 28px">
    <h1 style="margin:0 0 10px;font-size:19px;color:#0f172a">
      ${prenom ? `${esc(prenom)}, vous` : "Vous"} avez une réponse</h1>
    <p style="margin:0 0 22px;color:#475569;font-size:15px;line-height:1.6">
      Nous venons de vous répondre au sujet de <b>${esc(titre)}</b>.
      Le message vous attend dans votre espace.
    </p>
    <p style="margin:0 0 18px" align="center">
      <a href="${esc(lien)}" style="display:inline-block;background:#1B4BE3;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 28px;border-radius:11px">
        Lire la réponse</a>
    </p>
    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6">
      Vous pouvez répondre directement depuis votre espace — c'est là que
      toute la conversation est conservée.
    </p>
  </td></tr>
  <tr><td style="padding:14px 28px;background:#f8fafc;text-align:center;font-size:11px;color:#94a3b8">
    Group Arsène · contact@grouparsene.fr
  </td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    // Appelée par le déclencheur en base, qui présente le secret partagé.
    // On accepte aussi la clé de service : sans ça, impossible de tester la
    // fonction et de voir pourquoi un envoi échoue.
    const secret = req.headers.get("x-cron-secret");
    const porteur = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const autorise = (secret && secret === Deno.env.get("CRON_SECRET")) || porteur === SRV;
    if (!autorise) { try { const b = await req.clone().json(); await consigner(b?.site_id, false, "appel non autorisé"); } catch { /* rien */ }
      return json({ error: "Non autorisé." }, 401); }

    const { site_id, base_url } = await req.json();
    if (!site_id) return json({ error: "site_id requis." }, 400);

    // À qui écrire, et de quel site parle-t-on.
    const cr = await fetch(
      `${URL_SB}/rest/v1/client_comptes?site_id=eq.${site_id}&actif=is.true&select=user_id,nom`,
      { headers: H });
    const compte = (await cr.json())?.[0];
    if (!compte) { await consigner(site_id, false, "aucun compte client sur ce site"); return json({ ok: true, envoye: false }); }

    const ur = await fetch(`${URL_SB}/auth/v1/admin/users/${compte.user_id}`, { headers: H });
    const email = (await ur.json())?.email;
    if (!email) { await consigner(site_id, false, "compte sans email"); return json({ ok: true, envoye: false }); }

    const sr = await fetch(`${URL_SB}/rest/v1/client_sites?id=eq.${site_id}&select=title`, { headers: H });
    const titre = (await sr.json())?.[0]?.title || "votre site";

    // Envoi par le Gmail de l'agence — même chemin que l'invitation.
    const ga = await fetch(`${URL_SB}/rest/v1/gmail_accounts?select=email,refresh_token&limit=1`, { headers: H });
    const gmail = (await ga.json())?.[0];
    if (!gmail?.refresh_token) { await consigner(site_id, false, "aucun Gmail connecté", email); return json({ ok: true, envoye: false }); }

    const tr = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!,
        client_secret: Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!,
        refresh_token: gmail.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    if (!tr.ok) { await consigner(site_id, false, "jeton Gmail expiré : " + (await tr.text()).slice(0,120), email); return json({ ok: true, envoye: false }); }
    const { access_token } = await tr.json();

    const racine = (base_url || "https://espace.grouparsene.fr").replace(/\/$/, "");
    const html = courriel(compte.nom, titre, `${racine}/espace`);
    const b64 = (t: string) => btoa(String.fromCharCode(...new TextEncoder().encode(t)));
    const brut =
      `From: =?UTF-8?B?${b64("Group Arsène")}?= <${gmail.email}>\r\n` +
      `To: ${email}\r\n` +
      `Subject: =?UTF-8?B?${b64(`Vous avez une réponse — ${titre}`)}?=\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/html; charset=UTF-8\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` + b64(html);

    const env = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        raw: b64(brut).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
      }),
    });
    if (!env.ok) { await consigner(site_id, false, (await env.text()).slice(0, 200), email); return json({ ok: true, envoye: false }); }

    await consigner(site_id, true, null, email);
    return json({ ok: true, envoye: true, destinataire: email });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
