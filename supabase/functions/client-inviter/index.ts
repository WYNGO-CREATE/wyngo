/**
 * ─── Ouvrir l'espace d'un client ──────────────────────────────────────
 *
 * L'agence déclenche la création du compte depuis le Studio. Le client reçoit
 * un email pour choisir son mot de passe : on n'en invente jamais un à sa
 * place, et personne chez Group Arsène ne connaît le sien.
 *
 * ── Pourquoi on envoie l'email nous-mêmes ──
 * `generate_link` ne fait qu'ASSEMBLER l'adresse ; il n'envoie rien. La
 * première version s'arrêtait là : le compte était créé, le lien affiché à
 * l'écran, et le client n'a jamais rien reçu.
 * On passe donc par le Gmail déjà connecté de l'agence. C'est gratuit, ça
 * part de contact@grouparsene.fr — ce qu'un client reconnaît — et ça évite le
 * serveur d'envoi de Supabase, limité à quelques messages par heure.
 *
 * Un compte = un site. Le client n'a aucun accès au CRM : sa seule porte est
 * l'espace client, et les politiques de sécurité de la base le limitent à son
 * propre site.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: SRV, Authorization: `Bearer ${SRV}`, "Content-Type": "application/json" };

/** L'agence qui appelle, lue dans son jeton — jamais dans le corps de la requête. */
function appelant(req: Request): string | null {
  const t = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const p = t.split(".");
  if (p.length !== 3) return null;
  try {
    const c = p[1].replace(/-/g, "+").replace(/_/g, "/");
    const charge = JSON.parse(atob(c.padEnd(Math.ceil(c.length / 4) * 4, "=")));
    return charge?.role === "service_role" ? null : (charge?.sub ?? null);
  } catch { return null; }
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/** L'email d'invitation. Court : il n'a qu'une chose à faire faire. */
function courrielInvitation(prenom: string | null, titre: string, lien: string) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 4px 22px rgba(15,23,42,.07)">
  <tr><td style="padding:26px 28px 18px;border-bottom:1px solid #eef2f7">
    <table role="presentation"><tr>
      <td><div style="width:34px;height:34px;line-height:34px;text-align:center;border-radius:9px;background:#0f172a;color:#fff;font-weight:700">A</div></td>
      <td style="padding-left:10px">
        <div style="font-weight:700;letter-spacing:.5px;font-size:14px;color:#0f172a">GROUP ARSÈNE</div>
        <div style="font-size:10px;letter-spacing:2px;color:#94a3b8;text-transform:uppercase">Espace client</div>
      </td></tr></table>
  </td></tr>
  <tr><td style="padding:28px">
    <h1 style="margin:0 0 10px;font-size:20px;color:#0f172a">${prenom ? `Bonjour ${esc(prenom)},` : "Bonjour,"}</h1>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6">
      Votre espace client est ouvert. Vous y suivrez l'avancement de
      <b>${esc(titre)}</b>, vous pourrez nous écrire directement, et une fois le
      site en ligne, voir combien de personnes le consultent et vous contactent.
    </p>
    <p style="margin:0 0 22px;color:#475569;font-size:15px;line-height:1.6">
      Cliquez ci-dessous pour choisir votre mot de passe. Nous ne le connaîtrons jamais.
    </p>
    <p style="margin:0 0 20px" align="center">
      <a href="${esc(lien)}" style="display:inline-block;background:#1B4BE3;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 30px;border-radius:11px">
        Ouvrir mon espace</a>
    </p>
    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6">
      Ce lien est personnel et valable une seule fois. S'il a expiré, écrivez-nous
      et nous vous en renverrons un.
    </p>
  </td></tr>
  <tr><td style="padding:16px 28px;background:#f8fafc;text-align:center;font-size:11px;color:#94a3b8">
    Group Arsène · contact@grouparsene.fr
  </td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const moi = appelant(req);
    if (!moi) return json({ error: "Non authentifié." }, 401);

    const { site_id, email, nom, base_url } = await req.json();
    if (!site_id || !email) return json({ error: "site_id et email sont requis." }, 400);

    // Le site doit m'appartenir : on ne crée pas un client sur le site d'un autre.
    const rs = await fetch(
      `${URL_SB}/rest/v1/client_sites?id=eq.${site_id}&owner_id=eq.${moi}&select=id,title`,
      { headers: H },
    );
    const sites = await rs.json();
    if (!Array.isArray(sites) || !sites.length) return json({ error: "Site introuvable." }, 404);

    // Le compte existe peut-être déjà (client d'un autre site, ou ré-invitation).
    const ru = await fetch(
      `${URL_SB}/auth/v1/admin/users?filter=${encodeURIComponent(String(email))}`, { headers: H },
    );
    const found = await ru.json();
    let user_id: string | null = (found?.users || []).find(
      (u: any) => (u.email || "").toLowerCase() === String(email).toLowerCase(),
    )?.id ?? null;

    if (!user_id) {
      // On crée le compte sans mot de passe : il le choisira lui-même.
      const cr = await fetch(`${URL_SB}/auth/v1/admin/users`, {
        method: "POST",
        headers: H,
        body: JSON.stringify({
          email, email_confirm: false,
          user_metadata: { full_name: nom || null, espace_client: true },
        }),
      });
      const cu = await cr.json();
      if (!cr.ok) return json({ error: cu?.msg || cu?.message || "Création impossible." }, 400);
      user_id = cu.id;
    }

    await fetch(`${URL_SB}/rest/v1/client_comptes?on_conflict=user_id`, {
      method: "POST",
      headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ user_id, site_id, nom: nom || null, actif: true }),
    });

    // Lien de première connexion. Attention : generate_link n'envoie rien,
    // il ne fait que fabriquer l'adresse.
    const redirect = `${(base_url || "").replace(/\/$/, "")}/espace`;
    const lr = await fetch(`${URL_SB}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({ type: "recovery", email, options: { redirect_to: redirect } }),
    });
    const lienData = await lr.json();
    const lien = lienData?.properties?.action_link ?? lienData?.action_link ?? null;
    if (!lien) return json({ error: "Lien de connexion impossible à générer." }, 400);

    // ── L'envoi, par le Gmail de l'agence ──
    let envoye = false, souci: string | null = null;
    try {
      const ga = await fetch(`${URL_SB}/rest/v1/gmail_accounts?select=email,refresh_token&limit=1`, { headers: H });
      const compte = (await ga.json())?.[0];
      if (!compte?.refresh_token) {
        souci = "Aucun compte Gmail connecté : transmettez le lien vous-même.";
      } else {
        const tr = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!,
            client_secret: Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!,
            refresh_token: compte.refresh_token,
            grant_type: "refresh_token",
          }),
        });
        if (!tr.ok) {
          souci = "Jeton Gmail expiré — reconnectez le compte, ou transmettez le lien.";
        } else {
          const { access_token } = await tr.json();
          const b64 = (t: string) => btoa(String.fromCharCode(...new TextEncoder().encode(t)));
          const titre = sites[0].title || "votre site";
          const html = courrielInvitation(nom, titre, lien);
          const sujet = `Votre espace client Group Arsène — ${titre}`;
          const brut =
            `From: =?UTF-8?B?${b64("Group Arsène")}?= <${compte.email}>\r\n` +
            `To: ${email}\r\n` +
            `Subject: =?UTF-8?B?${b64(sujet)}?=\r\n` +
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
          if (env.ok) envoye = true;
          else souci = `Envoi refusé : ${(await env.text()).slice(0, 140)}`;
        }
      }
    } catch (e) {
      souci = String(e).slice(0, 140);
    }

    return json({
      ok: true,
      user_id,
      envoye,
      destinataire: email,
      souci,
      // Toujours renvoyé : si l'email n'arrive pas, l'agence doit pouvoir
      // transmettre le lien elle-même plutôt que de laisser le client dehors.
      lien,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
