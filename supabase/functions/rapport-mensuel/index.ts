/**
 * ─── Le rapport mensuel, sans saisie ──────────────────────────────────
 *
 * Tout est collecté : la fréquentation vient de notre propre mesure, la note
 * et le nombre d'avis viennent de Google Places. Il ne reste rien à taper.
 *
 * Ce qui a été retiré : la « position Google ». Une position honnête dépend du
 * mot-clé, de la ville et de l'appareil de celui qui cherche, et ne s'obtient
 * qu'avec Search Console, site par site, après autorisation du client.
 * L'inventer serait mentir. À la place, on montre la part de visiteurs arrivés
 * par un moteur de recherche — ça, ça se mesure, et ça dit la même chose au
 * client : est-ce qu'on me trouve ?
 *
 * Actions :
 *   { action: "apercu",  site_id }            → les chiffres + le HTML
 *   { action: "envoyer", site_id, email }     → enregistre et envoie
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PLACES = Deno.env.get("GOOGLE_PLACES_API_KEY");

const H = { apikey: SRV, Authorization: `Bearer ${SRV}`, "Content-Type": "application/json" };

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const nf = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n || 0));

/** « +34 % », « −12 % », ou rien si l'on n'a pas de quoi comparer. */
function evolution(a: number, b: number): { texte: string; monte: boolean | null } {
  if (!b) return { texte: a > 0 ? "premier mois mesuré" : "", monte: null };
  const p = Math.round(((a - b) / b) * 100);
  if (p === 0) return { texte: "stable", monte: null };
  return { texte: `${p > 0 ? "+" : "−"}${Math.abs(p)} % vs mois dernier`, monte: p > 0 };
}

/** La note Google et le nombre d'avis. Une requête par site et par mois. */
async function noteGoogle(nom: string, ville: string | null): Promise<{ note: number; avis: number } | null> {
  if (!PLACES || !nom) return null;
  try {
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": PLACES,
        "X-Goog-FieldMask": "places.rating,places.userRatingCount",
      },
      body: JSON.stringify({
        textQuery: [nom, ville].filter(Boolean).join(" "),
        languageCode: "fr", regionCode: "FR", maxResultCount: 1,
      }),
    });
    if (!r.ok) return null;
    const p = (await r.json())?.places?.[0];
    if (!p?.rating) return null;
    return { note: Number(p.rating), avis: Number(p.userRatingCount ?? 0) };
  } catch { return null; }
}

const LIB_CONTACTS: Record<string, string> = {
  telephone: "Appels depuis le site",
  formulaire: "Formulaires envoyés",
  email: "Emails ouverts",
  itineraire: "Itinéraires demandés",
  whatsapp: "Messages WhatsApp",
};

function courriel(d: any, site: any, note: { note: number; avis: number } | null, lien: string) {
  const ev = {
    visiteurs: evolution(d.visiteurs, d.visiteurs_avant),
    contacts: evolution(d.contacts, d.contacts_avant),
    recherche: evolution(d.via_recherche, d.via_recherche_avant),
  };
  const teinte = (m: boolean | null) => m === null ? "#64748b" : m ? "#059669" : "#dc2626";

  const grand = (label: string, valeur: string, e?: { texte: string; monte: boolean | null }) => `
    <td style="padding:0 8px" width="33%" valign="top">
      <div style="background:#f8fafc;border:1px solid #e8edf3;border-radius:14px;padding:16px 14px">
        <div style="font-size:12px;color:#64748b;margin-bottom:6px">${esc(label)}</div>
        <div style="font-size:30px;font-weight:700;color:#0f172a;line-height:1.1">${esc(valeur)}</div>
        ${e?.texte ? `<div style="font-size:11px;margin-top:5px;color:${teinte(e.monte)}">${esc(e.texte)}</div>` : ""}
      </div>
    </td>`;

  const contacts = Object.entries(d.detail_contacts || {})
    .filter(([, n]) => Number(n) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  const ligne = (g: string, n: number) => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155">${esc(LIB_CONTACTS[g] ?? g)}</td>
      <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:15px;font-weight:600;text-align:right;color:#0f172a">${nf(n)}</td>
    </tr>`;

  const sources = (d.sources || []).map((s: any) => `
    <tr>
      <td style="padding:7px 0;font-size:14px;color:#334155">${esc(s.source)}</td>
      <td style="padding:7px 0;font-size:14px;text-align:right;color:#64748b">${nf(s.n)} visiteurs</td>
    </tr>`).join("");

  const dureeTxt = d.duree_moyenne_s > 0
    ? `${Math.floor(d.duree_moyenne_s / 60)} min ${Math.round(d.duree_moyenne_s % 60)} s`
    : "—";

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:28px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.07)">

  <tr><td style="padding:26px 28px 20px;border-bottom:1px solid #eef2f7">
    <table role="presentation" width="100%"><tr>
      <td><div style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;border-radius:9px;background:#0f172a;color:#fff;font-weight:700">A</div></td>
      <td style="padding-left:10px">
        <div style="font-weight:700;letter-spacing:.5px;font-size:14px;color:#0f172a">GROUP ARSÈNE</div>
        <div style="font-size:10px;letter-spacing:2px;color:#94a3b8;text-transform:uppercase">Bilan mensuel</div>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:26px 28px 6px">
    <h1 style="margin:0;font-size:21px;color:#0f172a">${esc(site.title || "Votre site")}</h1>
    <p style="margin:6px 0 0;color:#64748b;font-size:14px">Ce qui s'est passé en ${esc(d.mois_libelle)}.</p>
  </td></tr>

  <tr><td style="padding:18px 20px 4px">
    <table role="presentation" width="100%"><tr>
      ${grand("Visiteurs", nf(d.visiteurs), ev.visiteurs)}
      ${grand("Ont voulu vous joindre", nf(d.contacts), ev.contacts)}
      ${grand("Venus par une recherche", nf(d.via_recherche), ev.recherche)}
    </tr></table>
  </td></tr>

  ${contacts.length ? `
  <tr><td style="padding:22px 28px 4px">
    <h2 style="margin:0 0 4px;font-size:15px;color:#0f172a">Ils ont voulu vous joindre</h2>
    <p style="margin:0 0 10px;font-size:12.5px;color:#94a3b8">Ce sont ces gestes qui deviennent des clients.</p>
    <table role="presentation" width="100%">${contacts.map(([g, n]) => ligne(g, Number(n))).join("")}</table>
  </td></tr>` : ""}

  ${sources ? `
  <tr><td style="padding:22px 28px 4px">
    <h2 style="margin:0 0 10px;font-size:15px;color:#0f172a">D'où ils viennent</h2>
    <table role="presentation" width="100%">${sources}</table>
  </td></tr>` : ""}

  <tr><td style="padding:22px 28px 4px">
    <table role="presentation" width="100%" style="background:#f8fafc;border-radius:12px">
      <tr>
        <td style="padding:14px 16px;font-size:13px;color:#64748b">Temps passé par visite</td>
        <td style="padding:14px 16px;font-size:14px;font-weight:600;text-align:right;color:#0f172a">${esc(dureeTxt)}</td>
      </tr>
      ${note ? `<tr>
        <td style="padding:14px 16px;border-top:1px solid #eef2f7;font-size:13px;color:#64748b">Votre note Google</td>
        <td style="padding:14px 16px;border-top:1px solid #eef2f7;font-size:14px;font-weight:600;text-align:right;color:#0f172a">
          ${note.note.toFixed(1)} ★ <span style="font-weight:400;color:#94a3b8">(${nf(note.avis)} avis)</span></td>
      </tr>` : ""}
      ${d.meilleur_jour ? `<tr>
        <td style="padding:14px 16px;border-top:1px solid #eef2f7;font-size:13px;color:#64748b">Votre meilleure journée</td>
        <td style="padding:14px 16px;border-top:1px solid #eef2f7;font-size:14px;font-weight:600;text-align:right;color:#0f172a">
          ${esc(new Date(d.meilleur_jour.jour).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }))}
          <span style="font-weight:400;color:#94a3b8">— ${nf(d.meilleur_jour.visites)} vues</span></td>
      </tr>` : ""}
    </table>
  </td></tr>

  <tr><td style="padding:24px 28px 28px" align="center">
    <a href="${esc(lien)}" style="display:inline-block;background:#1B4BE3;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:13px 26px;border-radius:11px">
      Voir le détail dans mon espace</a>
    <p style="margin:14px 0 0;font-size:11.5px;color:#94a3b8;line-height:1.6">
      Ces chiffres sont mesurés directement sur votre site, sans cookie et sans conserver
      d'adresse IP — vos visiteurs n'ont donc aucun bandeau à accepter.
    </p>
  </td></tr>

  <tr><td style="padding:16px 28px;background:#f8fafc;text-align:center;font-size:11px;color:#94a3b8">
    Group Arsène · contact@grouparsene.fr
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const jeton = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!jeton) return json({ error: "Non authentifié." }, 401);

    const { action, site_id, mois, email, base_url } = await req.json();
    if (!site_id) return json({ error: "site_id requis." }, 400);

    // Les chiffres sont lus AVEC le jeton de l'appelant : la fonction SQL
    // vérifie elle-même qu'il a le droit de voir ce site.
    const rr = await fetch(`${URL_SB}/rest/v1/rpc/rapport_mensuel`, {
      method: "POST",
      headers: { apikey: SRV, Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_site: site_id, p_mois: mois ?? null }),
    });
    const d = await rr.json();
    if (!rr.ok || d?.message) return json({ error: d?.message || "Chiffres indisponibles." }, 400);

    // Le libellé du mois est reformaté ici : la base de données n'est pas en
    // locale française et renvoyait « July 2026 ».
    try {
      const [an, mo] = String(d.mois).split("-").map(Number);
      d.mois_libelle = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" })
        .format(new Date(Date.UTC(an, mo - 1, 1)));
    } catch { /* on garde ce que la base a donné */ }

    const sr = await fetch(
      `${URL_SB}/rest/v1/client_sites?id=eq.${site_id}&select=id,title,slug,custom_domain,owner_id,prospect_id`,
      { headers: H });
    const site = (await sr.json())?.[0];
    if (!site) return json({ error: "Site introuvable." }, 404);

    // Ville du prospect, pour retrouver la bonne fiche Google.
    let ville: string | null = null;
    if (site.prospect_id) {
      const pr = await fetch(`${URL_SB}/rest/v1/prospects?id=eq.${site.prospect_id}&select=location`, { headers: H });
      const p = (await pr.json())?.[0];
      ville = (p?.location || "").match(/\d{5}\s+(.+)$/)?.[1] ?? null;
    }
    const note = await noteGoogle(site.title, ville);

    const racine = (base_url || "").replace(/\/$/, "");
    const html = courriel(d, site, note, `${racine}/espace`);

    if (action !== "envoyer") {
      return json({ ok: true, chiffres: d, note, html });
    }
    if (!email) return json({ error: "Email du client requis." }, 400);

    // On garde une trace de ce qui a été envoyé, pour l'historique.
    await fetch(`${URL_SB}/rest/v1/site_metrics?on_conflict=site_id,period`, {
      method: "POST",
      headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        site_id, owner_id: site.owner_id, period: `${d.mois}-01`,
        visits: d.visites, unique_visitors: d.visiteurs, leads: d.contacts,
        note_google: note?.note ?? null, avis_google: note?.avis ?? null,
        releve_le: new Date().toISOString(), sent_at: new Date().toISOString(),
      }),
    });

    // Envoi par le Gmail déjà connecté de l'agence — pas de service d'email
    // supplémentaire à payer ni à configurer. Le rapport part donc de
    // contact@grouparsene.fr, ce qui vaut mieux pour la délivrabilité qu'une
    // adresse d'expéditeur inconnue du client.
    const ga = await fetch(`${URL_SB}/rest/v1/gmail_accounts?select=email,refresh_token&limit=1`, { headers: H });
    const compte = (await ga.json())?.[0];
    if (!compte?.refresh_token) {
      return json({ ok: true, envoye: false, chiffres: d, html,
        avertissement: "Aucun compte Gmail connecté : le rapport est prêt mais n'a pas pu partir." });
    }

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
    if (!tr.ok) return json({ error: "Jeton Gmail expiré — reconnecte le compte." }, 400);
    const { access_token } = await tr.json();

    const sujet = `${site.title || "Votre site"} — bilan de ${d.mois_libelle}`;
    const b64 = (t: string) => btoa(String.fromCharCode(...new TextEncoder().encode(t)));
    const brut =
      `From: =?UTF-8?B?${b64("Group Arsène")}?= <${compte.email}>\r\n` +
      `To: ${email}\r\n` +
      `Subject: =?UTF-8?B?${b64(sujet)}?=\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/html; charset=UTF-8\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      b64(html);

    const env = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        raw: b64(brut).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
      }),
    });
    if (!env.ok) return json({ error: `Envoi refusé : ${(await env.text()).slice(0, 200)}` }, 400);

    return json({ ok: true, envoye: true, chiffres: d });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
