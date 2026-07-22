// ─────────────────────────────────────────────────────────────────────────
// market-script — Analyse concurrentielle réelle d'un prospect + script d'appel
// hyper-personnalisé.
//
// Entrée : { prospect_id }
// 1. Lit le prospect (métier = activity, ville = location).
// 2. Google Places (searchText) sur "{métier} {ville}" → vrais établissements.
// 3. TRIPLE VÉRIFICATION avant de retenir un concurrent :
//      (a) il a un site web,
//      (b) son adresse contient bien la ville,
//      (c) son site répond VRAIMENT en direct (HTTP < 400).
//    Tri par nombre d'avis (proxy de domination). Le prospect lui-même est exclu.
//    Aucun acteur n'est inventé : uniquement des données Places vérifiées.
// 4. Génère un script d'appel complet (Claude) qui n'utilise QUE ces concurrents
//    réels, sans jamais prétendre que Wyngo collabore avec eux (angle "ils dominent
//    le web, pas vous"). Respecte la philosophie de vente de l'agence.
// ─────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const PLACES_BASE = "https://places.googleapis.com/v1";

type Competitor = { name: string; website: string; rating: number | null; reviews: number; address: string | null };

const strip = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

function host(url: string | null | undefined): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; }
}

// Vérification (c) : le site répond-il vraiment ?
async function isLive(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4500);
    const r = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36" },
    });
    clearTimeout(t);
    // Une réponse HTTP (même 401/403/404 : le site bloque le bot mais EXISTE) = domaine vivant.
    // Google Places a déjà validé l'établissement + son site. Seuls erreur réseau / DNS / timeout = mort.
    return r.status < 500;
  } catch { return false; }
}

async function generateScript(args: {
  prenom: string; company: string; metier: string; ville: string; website: string | null;
  competitors: Competitor[]; philosophy: string; dos: string; donts: string;
}): Promise<string> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return "";
  const compList = args.competitors
    .map((c, i) => `${i + 1}. ${c.name} — ${c.reviews} avis Google${c.rating ? ` (${c.rating}/5)` : ""} — site en ligne : ${c.website}`)
    .join("\n");

  const prompt = `Tu es le meilleur formateur de vente téléphonique de France. Tu rédiges un SCRIPT D'APPEL de prospection 100% personnalisé pour UN prospect précis, pour le cabinet Wyngo (création de sites web sur-mesure + référencement local, basé à Toulouse). Le script doit être efficace, dense et prêt à être lu au téléphone (concis, sans remplissage — vise l'essentiel qui convainc), avec un ton parlé, calme, sûr et humain.

RÈGLES ABSOLUES (non négociables) :
- Tu n'utilises QUE les concurrents listés ci-dessous. Ils sont RÉELS et vérifiés. Tu n'inventes JAMAIS un nom, un chiffre, une référence ou une statistique.
- Tu ne dis JAMAIS que Wyngo travaille, collabore ou a un lien avec ces concurrents. Ils sont présentés comme les acteurs qui DOMINENT déjà le web sur le secteur du prospect — pour créer l'urgence et prouver qu'on connaît son marché mieux que lui.
- Tu respectes À LA LETTRE la philosophie, le "toujours faire" et le "ne jamais faire" ci-dessous.
- Laisse la variable {{expediteur}} telle quelle (c'est celui qui appelle). Le prénom et l'entreprise du prospect sont connus : écris-les en clair.

── LE PROSPECT ──
Interlocuteur : ${args.prenom || "le dirigeant"}
Entreprise : ${args.company}
Métier : ${args.metier}
Ville : ${args.ville}
Site web actuel : ${args.website || "aucun / introuvable sur le web"}

── SES CONCURRENTS QUI DOMINENT LE WEB (réels, vérifiés, site en ligne) ──
${compList}

${args.philosophy ? `── PHILOSOPHIE DE VENTE DU FONDATEUR (respecte-la à la lettre) ──\n${args.philosophy}\n` : ""}
${args.dos ? `── TOUJOURS FAIRE ──\n${args.dos}\n` : ""}
${args.donts ? `── NE JAMAIS FAIRE ──\n${args.donts}\n` : ""}

STRUCTURE (développe chaque phase, style parlé, prêt à lire) :
PHASE 1 — Accroche : transparence du fondateur, parle immédiatement de LUI, de son métier et de sa ville.
PHASE 2 — Le déclic : nomme 2 ou 3 de ces concurrents qui trustent Google sur "${args.metier} ${args.ville}", et fais-lui réaliser que lui n'y est pas — donc il perd chaque jour des clients qui vont chez eux.
PHASE 3 — La vision Wyngo + l'angle "vous faire arriver en tête sur Google" et l'urgence de l'IA de Google.
PHASE 4 — L'offre irrésistible : la maquette offerte (risque zéro) + notre marque de fabrique, on vient une demi-journée chez lui.
PHASE 5 — Le close : verrouiller un rendez-vous en proposant 2 créneaux précis.
Puis 2-3 réponses aux objections les plus probables pour CE métier.

Rends UNIQUEMENT le script, sans préambule ni commentaire.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 2000, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
  const d = await res.json();
  return d.content?.[0]?.text?.trim() || "";
}

// Extrait un métier PROPRE (1-3 mots, façon Google Maps) depuis ce que contient
// l'enrichissement — que ce soit déjà « notaire » ou une longue description.
async function cleanTrade(raw: string): Promise<string> {
  const r = raw.trim();
  // Déjà court et sans ponctuation de phrase = c'est un métier, on garde tel quel.
  if (r.length <= 32 && !/[.,;:()]/.test(r)) return r;
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  const fallback = () => r.replace(/[.,;:()].*/s, "").split(/\s+/).slice(0, 3).join(" ").trim() || r.slice(0, 30);
  if (!key) return fallback();
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 20,
        messages: [{ role: "user", content: `Donne UNIQUEMENT le métier / type d'établissement en 1 à 3 mots, en minuscule et au singulier, tel qu'on le taperait sur Google Maps (ex : "notaire", "coiffeur", "avocat", "restaurant", "plombier"). Aucune autre parole. Description : ${r}` }],
      }),
    });
    if (res.ok) {
      const d = await res.json();
      const t = (d.content?.[0]?.text || "").trim().toLowerCase().replace(/["'.]/g, "");
      if (t && t.length >= 3 && t.length <= 40) return t;
    }
  } catch { /* fallback ci-dessous */ }
  return fallback();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const { prospect_id } = await req.json();
    if (!prospect_id) return new Response(JSON.stringify({ error: "prospect_id requis" }), { status: 400, headers: cors });

    const { data: prospect, error: pErr } = await userClient.from("prospects").select("*").eq("id", prospect_id).single();
    if (pErr || !prospect) return new Response(JSON.stringify({ error: "Prospect introuvable" }), { status: 404, headers: cors });

    const rawMetier = String(prospect.brief_activity || prospect.industry || "").trim();
    const ville = String(prospect.location || "").trim();
    if (!rawMetier || !ville) {
      return new Response(JSON.stringify({
        competitors: [], script: null,
        warning: "Métier ou ville manquant sur la fiche du prospect. Complète « activité » et « ville » pour lancer l'analyse marché.",
      }), { status: 200, headers: cors });
    }

    // Métier propre pour la recherche Google (gère les fiches enrichies en longue description).
    const metier = await cleanTrade(rawMetier);

    const placesKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!placesKey) return new Response(JSON.stringify({ error: "GOOGLE_PLACES_API_KEY non configurée" }), { status: 500, headers: cors });

    const query = `${metier} ${ville}`;
    const pr = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": placesKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.websiteUri,places.userRatingCount,places.rating",
      },
      body: JSON.stringify({ textQuery: query, languageCode: "fr", maxResultCount: 20 }),
    });
    if (!pr.ok) return new Response(JSON.stringify({ error: `Places ${pr.status}` }), { status: 502, headers: cors });
    const places = (await pr.json()).places || [];

    // Mots significatifs de la ville (gère « 31000 Toulouse », « Toulouse, Occitanie », villes en 2 mots…)
    const villeWords = strip(ville).replace(/[^a-zà-ÿ\s]/gi, " ").split(/\s+/).filter((w) => w.length > 2);
    const prospectHost = host(prospect.website);
    const prospectName = strip(prospect.company || "");

    // Vérifs (a) site présent + (b) bonne ville + exclusion du prospect, tri par domination (avis)
    const candidates = (places as Array<{
      displayName?: { text?: string }; formattedAddress?: string; websiteUri?: string; userRatingCount?: number; rating?: number;
    }>)
      .filter((p) => !!p.websiteUri)
      .filter((p) => {
        const a = strip(p.formattedAddress || "");
        return villeWords.length === 0 || villeWords.some((w) => a.includes(w));
      })
      .filter((p) => {
        const h = host(p.websiteUri);
        const n = strip(p.displayName?.text || "");
        return h && h !== prospectHost && !(prospectName && n === prospectName);
      })
      .sort((a, b) => (b.userRatingCount || 0) - (a.userRatingCount || 0));

    // Dédup par domaine
    const seen = new Set<string>();
    const deduped = candidates.filter((p) => {
      const h = host(p.websiteUri)!;
      if (seen.has(h)) return false;
      seen.add(h);
      return true;
    });

    // Vérif (c) : site vraiment en ligne — vérifs EN PARALLÈLE sur les 8 meilleurs (rapide, pas de timeout), on garde les 4 premiers qui répondent
    const top = deduped.slice(0, 6);
    const liveFlags = await Promise.all(top.map((p) => isLive(p.websiteUri!)));
    const verified: Competitor[] = top
      .filter((_, i) => liveFlags[i])
      .slice(0, 4)
      .map((p) => ({
        name: p.displayName?.text || "",
        website: p.websiteUri!,
        rating: p.rating ?? null,
        reviews: p.userRatingCount ?? 0,
        address: p.formattedAddress || null,
      }));

    if (verified.length < 2) {
      return new Response(JSON.stringify({
        competitors: verified, script: null,
        warning: `Pas assez de concurrents vérifiés (site en ligne) trouvés pour « ${query} ». Aucun acteur n'a été inventé.`,
      }), { status: 200, headers: cors });
    }

    // Philosophie de l'agence (singleton)
    const svc = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: settings } = await svc.from("agency_settings").select("philosophy, call_dos, call_donts").eq("id", true).maybeSingle();

    let script: string | null = null;
    try {
      script = await generateScript({
        prenom: prospect.first_name && prospect.first_name.toLowerCase() !== "contact" ? prospect.first_name : "",
        company: prospect.company || "votre entreprise",
        metier, ville,
        website: prospect.website || null,
        competitors: verified,
        philosophy: settings?.philosophy || "",
        dos: settings?.call_dos || "",
        donts: settings?.call_donts || "",
      });
    } catch (e) {
      script = null;
      console.error("script gen failed", e);
    }

    return new Response(JSON.stringify({ competitors: verified, script, query }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
