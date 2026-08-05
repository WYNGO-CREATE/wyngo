/**
 * ─── Collecteur de mesure d'audience ──────────────────────────────────
 *
 * Reçoit les signaux envoyés par les sites clients. Publique par nature : un
 * visiteur anonyme ne peut pas s'authentifier.
 *
 * ── Ce qui n'est jamais conservé ──
 * L'adresse IP ne sert qu'au calcul d'une empreinte, en mémoire, puis elle est
 * jetée. L'empreinte mélange l'IP, le navigateur, l'identifiant du site et un
 * SEL QUOTIDIEN régénéré chaque nuit : deux visites du même appareil à deux
 * jours d'écart donnent deux empreintes sans lien. On ne peut donc ni suivre
 * quelqu'un dans le temps, ni remonter à lui — c'est ce qui dispense le site
 * du client de bandeau cookies.
 *
 * ── Pourquoi pas Google Analytics ──
 * Le script est servi depuis le domaine du client, donc aucun bloqueur ne
 * l'écarte. Les mesures tierces perdent couramment le tiers du trafic.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const GENRES = new Set([
  "page", "telephone", "email", "itineraire", "formulaire",
  "whatsapp", "lien_sortant", "profondeur", "sortie",
]);

/** Le sel du jour, gardé en mémoire tant que l'instance vit. */
let selJour: { jour: string; sel: string } | null = null;
async function sel(): Promise<string> {
  const jour = new Date().toISOString().slice(0, 10);
  if (selJour?.jour === jour) return selJour.sel;
  const r = await fetch(`${URL_SB}/rest/v1/rpc/sel_du_jour`, { method: "POST", headers: H, body: "{}" });
  const s = String(await r.json());
  selJour = { jour, sel: s };
  return s;
}

async function empreinte(ip: string, ua: string, site: string): Promise<string> {
  const data = new TextEncoder().encode(`${await sel()}|${ip}|${ua}|${site}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Famille d'appareil, déduite de l'en-tête du navigateur. */
function appareil(ua: string): string {
  const u = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(u)) return "tablette";
  if (/mobi|iphone|android.+mobile|windows phone/.test(u)) return "mobile";
  return "ordinateur";
}

function navigateur(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return "Autre";
}

function systeme(ua: string): string {
  if (/windows/i.test(ua)) return "Windows";
  if (/iphone|ipad|ios/i.test(ua)) return "iOS";
  if (/mac os/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/linux/i.test(ua)) return "Linux";
  return "Autre";
}

/** On ne garde que le domaine du référent — jamais l'URL complète, qui peut
 *  contenir une recherche ou un identifiant. */
function domaine(ref: string | undefined, propre: string): string | null {
  if (!ref) return null;
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    return h === propre ? null : h;          // navigation interne ≠ provenance
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  // Le navigateur envoie parfois via sendBeacon : la réponse doit être minuscule.
  try {
    const b = await req.json();
    const site_id = String(b.s || "");
    if (!/^[0-9a-f-]{36}$/i.test(site_id)) return new Response(null, { status: 204, headers: CORS });

    const genre = GENRES.has(String(b.e)) ? String(b.e) : "page";
    const ua = req.headers.get("user-agent") || "";

    // Les robots ne sont pas des visiteurs.
    if (/bot|crawl|spider|slurp|headless|lighthouse|preview|monitor/i.test(ua)) {
      return new Response(null, { status: 204, headers: CORS });
    }

    const ip = (req.headers.get("cf-connecting-ip")
      || req.headers.get("x-forwarded-for")?.split(",")[0]
      || "").trim();

    let hote = "";
    try { hote = new URL(String(b.u || "")).hostname.replace(/^www\./, ""); } catch { /* ignore */ }

    const ligne = {
      site_id,
      empreinte: await empreinte(ip, ua, site_id),
      session: String(b.v || "").slice(0, 40) || "sans",
      genre,
      chemin: (() => { try { return new URL(String(b.u)).pathname.slice(0, 300) || "/"; } catch { return "/"; } })(),
      titre: b.t ? String(b.t).slice(0, 200) : null,
      referent: domaine(b.r, hote),
      utm_source: b.us ? String(b.us).slice(0, 60) : null,
      utm_medium: b.um ? String(b.um).slice(0, 60) : null,
      utm_campagne: b.uc ? String(b.uc).slice(0, 60) : null,
      appareil: appareil(ua),
      navigateur: navigateur(ua),
      systeme: systeme(ua),
      pays: req.headers.get("cf-ipcountry") || null,
      region: null,
      ville: null,
      duree_s: Number.isFinite(+b.d) ? Math.min(Math.round(+b.d), 7200) : null,
      profondeur: Number.isFinite(+b.p) ? Math.max(0, Math.min(100, Math.round(+b.p))) : null,
      detail: b.x ?? null,
    };

    await fetch(`${URL_SB}/rest/v1/site_visites`, {
      method: "POST",
      headers: { ...H, Prefer: "return=minimal" },
      body: JSON.stringify(ligne),
    });

    return new Response(null, { status: 204, headers: CORS });
  } catch {
    // Une mesure qui échoue ne doit jamais se voir sur le site du client.
    return new Response(null, { status: 204, headers: CORS });
  }
});
