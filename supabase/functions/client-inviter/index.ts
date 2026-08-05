/**
 * ─── Ouvrir l'espace d'un client ──────────────────────────────────────
 *
 * L'agence déclenche la création du compte depuis le Studio. Le client reçoit
 * un email pour choisir son mot de passe : on n'en invente jamais un à sa
 * place, et personne chez Group Arsène ne connaît le sien.
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
      // `invite` envoie l'email qui laisse le client CHOISIR son mot de passe.
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

    // Lien de définition du mot de passe, envoyé par Supabase.
    const redirect = `${(base_url || "").replace(/\/$/, "")}/espace`;
    const lr = await fetch(`${URL_SB}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({ type: "recovery", email, options: { redirect_to: redirect } }),
    });
    const lien = await lr.json();

    return json({
      ok: true,
      user_id,
      // Renvoyé à l'agence pour qu'elle puisse le transmettre elle-même si
      // l'email n'arrive pas — un client bloqué dehors n'appelle pas, il râle.
      lien: lien?.properties?.action_link ?? lien?.action_link ?? null,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
