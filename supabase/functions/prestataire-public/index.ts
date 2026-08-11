/**
 * ─── Ce que le prestataire voit et signe ──────────────────────────────
 *
 * Deux pages publiques, ouvertes par un lien à jeton, sans compte :
 *
 *   • le MANDAT DE FACTURATION, qu'il signe une fois. Sans lui, Group Arsène
 *     n'a pas le droit d'établir une facture en son nom (art. 289, I-2 du
 *     CGI) — le déclencheur en base refuse d'ailleurs de l'émettre.
 *
 *   • chaque FACTURE établie pour son compte, qu'il valide ou conteste. Ce
 *     droit de contestation n'est pas une politesse : c'est une condition de
 *     régularité de l'autofacturation. Le prestataire reste responsable du
 *     contenu de SES factures, donc il doit pouvoir dire « ce n'est pas mon
 *     chiffre » avant qu'elle ne devienne définitive.
 *
 * Aucune authentification : le jeton EST la preuve. Il est tiré au hasard sur
 * 16 octets, ne se devine pas, et ne donne accès qu'à une seule pièce.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const URL_SB = Deno.env.get("SUPABASE_URL")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const H = { apikey: SRV, Authorization: `Bearer ${SRV}`, "Content-Type": "application/json" };

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const page = (html: string, s = 200) =>
  new Response(html, { status: s, headers: { ...CORS, "Content-Type": "text/html; charset=utf-8" } });

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const eur = (n: unknown) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(n ?? 0));
const jour = (d: unknown) =>
  d ? new Date(String(d)).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";
const moisDe = (p: string) => {
  const [a, m] = String(p).split("-");
  return new Date(Number(a), Number(m) - 1, 1)
    .toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};

async function api(chemin: string, init?: RequestInit) {
  const r = await fetch(`${URL_SB}/rest/v1/${chemin}`, { ...init, headers: { ...H, ...(init?.headers ?? {}) } });
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

/** L'adresse IP réelle du signataire, pour l'horodatage de la signature. */
const ipDe = (req: Request) =>
  (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;

const STYLE = `
:root { color-scheme: light }
* { box-sizing: border-box }
body { margin:0; background:#eef2f7; color:#0f172a; font:15px/1.65 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; padding:28px 14px }
.feuille { max-width:760px; margin:0 auto; background:#fff; border-radius:16px; box-shadow:0 4px 26px rgba(15,23,42,.08); overflow:hidden }
.tete { padding:26px 32px; border-bottom:1px solid #eef2f7; display:flex; align-items:center; gap:12px }
.jeton { width:36px;height:36px;line-height:36px;text-align:center;border-radius:9px;background:#0f172a;color:#fff;font-weight:700 }
.marque { font-weight:700; letter-spacing:.5px; font-size:14px }
.sur { font-size:10px; letter-spacing:2px; color:#94a3b8; text-transform:uppercase }
.corps { padding:30px 32px }
h1 { font-size:22px; margin:0 0 6px }
h2 { font-size:13px; text-transform:uppercase; letter-spacing:1.4px; color:#64748b; margin:26px 0 10px; font-weight:600 }
p { margin:0 0 12px }
.duo { display:grid; grid-template-columns:1fr 1fr; gap:18px }
@media (max-width:620px){ .duo { grid-template-columns:1fr } }
.bloc { border:1px solid #e6ebf2; border-radius:11px; padding:14px 16px; font-size:14px }
.bloc b { display:block; margin-bottom:4px }
.gris { color:#64748b }
table { width:100%; border-collapse:collapse; margin-top:8px; font-size:14px }
th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; padding:0 0 8px; font-weight:600 }
td { padding:11px 0; border-top:1px solid #eef2f7; vertical-align:top }
td.n, th.n { text-align:right; white-space:nowrap }
.totaux { margin-top:18px; margin-left:auto; max-width:320px }
.totaux div { display:flex; justify-content:space-between; padding:7px 0 }
.totaux .final { border-top:2px solid #0f172a; margin-top:6px; padding-top:11px; font-weight:700; font-size:17px }
.mentions { margin-top:26px; padding-top:18px; border-top:1px solid #eef2f7; font-size:12px; color:#64748b }
.mentions p { margin:0 0 7px }
.encadre { background:#f8fafc; border:1px solid #e6ebf2; border-radius:11px; padding:16px 18px; font-size:13.5px; margin:18px 0 }
.actions { padding:22px 32px; background:#f8fafc; border-top:1px solid #eef2f7 }
label { display:block; font-size:13px; font-weight:600; margin:0 0 6px }
input, textarea { width:100%; padding:11px 13px; border:1px solid #d8e0ea; border-radius:9px; font:inherit; font-size:15px; background:#fff }
button { border:0; border-radius:10px; padding:13px 24px; font:inherit; font-weight:600; font-size:15px; cursor:pointer }
.principal { background:#1B4BE3; color:#fff }
.secondaire { background:#fff; color:#b91c1c; border:1px solid #fecaca }
.rangee { display:flex; gap:10px; flex-wrap:wrap; margin-top:16px }
.etat { padding:13px 16px; border-radius:11px; font-size:14px; font-weight:600; margin-bottom:4px }
.ok { background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0 }
.ko { background:#fef2f2; color:#991b1b; border:1px solid #fecaca }
.pied { padding:14px 32px; background:#f8fafc; text-align:center; font-size:11px; color:#94a3b8 }
.cache { display:none }
.recours { margin:14px 0 0; font-size:12.5px; color:#94a3b8 }
.lien { background:none; border:0; padding:0; font:inherit; color:#64748b;
        text-decoration:underline; cursor:pointer }
`;

function enveloppe(titre: string, contenu: string, actions = "") {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titre)}</title><style>${STYLE}</style></head><body>
<div class="feuille">
  <div class="tete">
    <div class="jeton">A</div>
    <div><div class="marque">GROUP ARSÈNE</div><div class="sur">${esc(titre)}</div></div>
  </div>
  <div class="corps">${contenu}</div>
  ${actions ? `<div class="actions">${actions}</div>` : ""}
  <div class="pied">Group Arsène · contact@grouparsene.fr · signature électronique horodatée (eIDAS)</div>
</div></body></html>`;
}

const message = (titre: string, texte: string) =>
  enveloppe(titre, `<h1>${esc(titre)}</h1><p class="gris">${esc(texte)}</p>`);

/** L'identité de Group Arsène, telle qu'elle doit figurer sur la facture. */
async function agence() {
  // Le client de la facture, c'est Group Arsène — donc l'administrateur.
  // Depuis que chaque membre a sa propre fiche, « la première ligne » aurait
  // pu être celle d'un collaborateur.
  const adm = (await api("user_roles?role=eq.admin&select=user_id&order=created_at&limit=1"))?.[0];
  const s = (adm && (await api(`billing_settings?owner_id=eq.${adm.user_id}&select=*`))?.[0]) || {};
  return {
    nom: s.trade_name || s.legal_name || "Group Arsène",
    forme: s.legal_form || "Entreprise Individuelle",
    adresse: s.address, cp: s.postal_code, ville: s.city,
    siret: s.siret, tva: s.vat_number,
    delai: s.payment_terms_days ?? 30,
    penalites: s.late_penalty,
  };
}

const identite = (p: any) => `
  <b>${esc(p.denomination)}</b>
  ${p.adresse ? esc(p.adresse) + "<br>" : ""}
  ${[p.code_postal, p.ville].filter(Boolean).map(esc).join(" ")}<br>
  ${p.siret ? "SIRET " + esc(p.siret) + "<br>" : ""}
  ${p.regime_tva === "reel" && p.tva_numero ? "TVA " + esc(p.tva_numero) : ""}`;

const identiteAgence = (a: any) => `
  <b>${esc(a.nom)}</b>
  ${esc(a.forme)}<br>
  ${a.adresse ? esc(a.adresse) + "<br>" : ""}
  ${[a.cp, a.ville].filter(Boolean).map(esc).join(" ")}<br>
  ${a.siret ? "SIRET " + esc(a.siret) : ""}`;

// ─────────────────────────────────────────────────────────────────────
// LE MANDAT DE FACTURATION
// ─────────────────────────────────────────────────────────────────────
function pageMandat(p: any, a: any) {
  if (p.mandat_signe_le) {
    return enveloppe("Mandat de facturation", `
      <div class="etat ok">Mandat signé le ${jour(p.mandat_signe_le)} par ${esc(p.mandat_signe_par)}.</div>
      <p class="gris">Group Arsène peut désormais établir vos factures en votre nom.
      Chacune vous sera envoyée pour validation avant d'être définitive.</p>
      ${corpsMandat(p, a)}`);
  }
  return enveloppe("Mandat de facturation", `
    <h1>Mandat de facturation</h1>
    <p class="gris">À lire et signer une seule fois. Il autorise Group Arsène à établir
    vos factures en votre nom — vous gardez la main sur chacune d'elles.</p>
    ${corpsMandat(p, a)}`,
    `<form method="post">
       <input type="hidden" name="action" value="signer_mandat">
       <label for="nom">Votre nom et prénom, pour signer</label>
       <input id="nom" name="nom" required autocomplete="name" placeholder="${esc(p.nom_complet)}">
       <div class="rangee"><button class="principal" type="submit">Signer le mandat</button></div>
       <p class="gris" style="font-size:12px;margin-top:12px">
         Votre signature est horodatée et votre adresse IP enregistrée, conformément au règlement eIDAS.
       </p>
     </form>`);
}

function corpsMandat(p: any, a: any) {
  return `
  <h2>Entre les parties</h2>
  <div class="duo">
    <div class="bloc"><span class="gris" style="font-size:11px">LE MANDANT (prestataire)</span><br>${identite(p)}</div>
    <div class="bloc"><span class="gris" style="font-size:11px">LE MANDATAIRE (client)</span><br>${identiteAgence(a)}</div>
  </div>

  <h2>Objet</h2>
  <p>Le mandant donne mandat au mandataire d'établir, <b>en son nom et pour son compte</b>,
  les factures correspondant aux prestations qu'il réalise pour lui, conformément au
  <b>2 du I de l'article 289 du Code général des impôts</b>.</p>

  <h2>Ce que cela change, et ce que cela ne change pas</h2>
  <div class="encadre">
    <p><b>1.</b> Le mandataire établit chaque facture selon la rémunération convenue et l'adresse au mandant.</p>
    <p><b>2.</b> Chaque facture porte un numéro appartenant à la <b>série propre au mandant</b>, séquentielle et sans rupture.</p>
    <p><b>3.</b> Le mandant dispose d'un <b>délai de 15 jours</b> pour contester une facture. Passé ce délai sans contestation, elle est réputée acceptée.</p>
    <p><b>4.</b> Le mandant <b>conserve l'entière responsabilité</b> de ses obligations déclaratives et fiscales, notamment en matière de TVA. Le mandat ne les transfère pas.</p>
    <p><b>5.</b> Chaque partie conserve un exemplaire de chaque facture pendant la durée légale de conservation.</p>
    <p><b>6.</b> Le mandat est conclu pour une durée indéterminée et peut être <b>révoqué à tout moment</b> par l'une ou l'autre des parties, par simple écrit.</p>
  </div>

  <h2>Rémunération convenue</h2>
  <p>${p.nature === "prospection"
      ? `Commission de <b>${esc(p.commission_pct)} %</b> du montant hors taxes des affaires apportées, calculée sur les factures clients ${
          p.base_commission === "facture_payee" ? "<b>encaissées</b>" : "<b>émises</b>"} au cours du mois.`
      : `Forfait convenu par mission, porté au relevé du mois où la mission est livrée.`}</p>

  <h2>Régime de TVA du mandant</h2>
  <p>${p.regime_tva === "franchise"
      ? "Franchise en base de TVA — les factures porteront la mention « TVA non applicable, article 293 B du CGI »."
      : `Assujetti à la TVA au taux de ${esc(p.taux_tva)} %.`}</p>`;
}

// ─────────────────────────────────────────────────────────────────────
// LA FACTURE
// ─────────────────────────────────────────────────────────────────────
function pageFacture(f: any, p: any, a: any) {
  const lignes = Array.isArray(f.lignes) ? f.lignes : [];
  const echeance = f.emise_le
    ? new Date(new Date(f.emise_le).getTime() + (a.delai ?? 30) * 864e5)
    : null;

  const etat =
    f.statut === "validee" ? `<div class="etat ok">Facture validée le ${jour(f.validee_le)}.</div>` :
    f.statut === "payee"   ? `<div class="etat ok">Facture réglée le ${jour(f.payee_le)}.</div>` :
    f.statut === "contestee" ? `<div class="etat ko">Facture contestée le ${jour(f.contestee_le)}.<br>
                                  <span style="font-weight:400">« ${esc(f.motif_contestation)} »</span><br>
                                  <span style="font-weight:400">Group Arsène a été prévenu et reviendra vers vous.</span></div>` : "";

  const contenu = `
  ${etat}
  <h1>Facture n° ${esc(f.numero)}</h1>
  <p class="gris">${esc(moisDe(f.periode))} · émise le ${jour(f.emise_le)}</p>

  <div class="duo" style="margin-top:22px">
    <div class="bloc"><span class="gris" style="font-size:11px">ÉMETTEUR</span><br>${identite(p)}</div>
    <div class="bloc"><span class="gris" style="font-size:11px">CLIENT</span><br>${identiteAgence(a)}</div>
  </div>

  <h2>Détail</h2>
  <table>
    <thead><tr><th>Prestation</th><th class="n">Base HT</th><th class="n">Taux</th><th class="n">Montant HT</th></tr></thead>
    <tbody>
      ${lignes.map((l: any) => `<tr>
        <td>${esc(l.libelle)}${l.detail ? `<br><span class="gris" style="font-size:12.5px">${esc(l.detail)}</span>` : ""}</td>
        <td class="n">${l.base != null ? eur(l.base) : "—"}</td>
        <td class="n">${l.taux != null ? esc(l.taux) + " %" : "—"}</td>
        <td class="n">${eur(l.montant)}</td>
      </tr>`).join("") || `<tr><td colspan="4" class="gris">Aucune ligne.</td></tr>`}
    </tbody>
  </table>

  <div class="totaux">
    <div><span>Total HT</span><span>${eur(f.total_ht)}</span></div>
    <div><span>TVA</span><span>${p.regime_tva === "franchise" ? "—" : eur(f.total_tva)}</span></div>
    <div class="final"><span>Net à payer</span><span>${eur(f.total_ttc)}</span></div>
  </div>

  <div class="mentions">
    <p><b>Facture établie par le client au nom et pour le compte de ${esc(p.denomination)}</b>,
       en vertu du mandat de facturation signé le ${jour(p.mandat_signe_le)}
       (article 289, I-2 du Code général des impôts).</p>
    ${p.regime_tva === "franchise"
      ? "<p>TVA non applicable, article 293 B du Code général des impôts.</p>" : ""}
    <p>Période concernée : ${esc(moisDe(f.periode))}.
       Échéance de règlement : ${echeance ? jour(echeance.toISOString()) : "—"}.</p>
    <p>${esc(a.penalites || "En cas de retard de paiement, des pénalités de retard sont exigibles au taux d'intérêt légal majoré de 10 points.")}</p>
    <p>Tout retard de paiement entraîne de plein droit une <b>indemnité forfaitaire pour frais de
       recouvrement de 40 €</b> (art. D. 441-5 du Code de commerce). Pas d'escompte pour paiement anticipé.</p>
    ${p.iban ? `<p>Règlement par virement — IBAN ${esc(p.iban)}${p.bic ? " · BIC " + esc(p.bic) : ""}.</p>` : ""}
  </div>`;

  // Une facture déjà tranchée ne se rejoue pas.
  if (f.statut === "validee" || f.statut === "payee" || f.statut === "contestee") {
    return enveloppe("Facture", contenu);
  }

  return enveloppe("Facture", contenu, `
    <p style="margin:0 0 14px;font-size:14px">
      Vérifiez le détail ci-dessus. <b>Sans réponse de votre part sous 15 jours</b>,
      la facture sera réputée acceptée.
    </p>
    <form method="post" id="f">
      <input type="hidden" name="action" id="action" value="valider">
      <label for="nom">Votre nom et prénom</label>
      <input id="nom" name="nom" required autocomplete="name" placeholder="${esc(p.nom_complet)}">
      <div id="zoneMotif" class="cache" style="margin-top:12px">
        <label for="motif">Ce qui ne va pas</label>
        <textarea id="motif" name="motif" rows="3" placeholder="Ex : il manque l'affaire Dupont signée le 12."></textarea>
      </div>
      <div class="rangee">
        <button class="principal" type="submit" onclick="document.getElementById('action').value='valider'">
          Valider cette facture</button>
      </div>
      <p class="recours">
        Un montant vous semble faux ?
        <button type="button" class="lien" onclick="contester()">Signalez-le</button>
      </p>
    </form>
    <script>
      function contester() {
        var z = document.getElementById('zoneMotif');
        if (z.classList.contains('cache')) {
          z.classList.remove('cache');
          document.getElementById('motif').setAttribute('required','required');
          document.getElementById('motif').focus();
        } else {
          document.getElementById('action').value = 'contester';
          document.getElementById('f').requestSubmit();
        }
      }
    </script>`);
}

// ─────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = new URL(req.url);
    const jeton = (url.searchParams.get("token") || "").replace(/[^a-f0-9]/gi, "");
    if (!jeton) return page(message("Lien invalide", "Ce lien est incomplet."), 400);

    // Le jeton désigne soit un mandat, soit une facture.
    const parMandat = (await api(`prestataires?mandat_token=eq.${jeton}&select=*`))?.[0] ?? null;
    const facture = parMandat ? null
      : (await api(`prestataire_factures?token=eq.${jeton}&select=*`))?.[0] ?? null;

    if (!parMandat && !facture) {
      return page(message("Lien introuvable", "Ce lien n'est plus valable. Demandez-en un nouveau."), 404);
    }

    const presta = parMandat
      ?? (await api(`prestataires?id=eq.${facture.prestataire_id}&select=*`))?.[0];
    if (!presta) return page(message("Lien introuvable", "Prestataire inconnu."), 404);

    const a = await agence();

    // ── Affichage ──
    if (req.method === "GET") {
      if (parMandat) return page(pageMandat(presta, a));
      if (!facture.vue_le) {
        await api(`prestataire_factures?id=eq.${facture.id}`, {
          method: "PATCH", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ vue_le: new Date().toISOString() }),
        });
      }
      return page(pageFacture(facture, presta, a));
    }

    // ── Réponse ──
    if (req.method === "POST") {
      // Le formulaire passe par le proxy du worker, qui réémet le corps avec
      // un content-type JSON. `formData()` échouerait donc : on lit le texte
      // brut et on le décode nous-mêmes, ce qui marche dans les deux cas.
      const form = new URLSearchParams(await req.text());
      const action = String(form.get("action") || "");
      const nom = String(form.get("nom") || "").trim();
      const ip = ipDe(req);
      if (!nom) return page(message("Nom manquant", "Indiquez votre nom pour signer."), 400);

      if (action === "signer_mandat") {
        if (presta.mandat_signe_le) return page(pageMandat(presta, a));
        await api(`prestataires?id=eq.${presta.id}`, {
          method: "PATCH", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            mandat_signe_le: new Date().toISOString(), mandat_signe_par: nom, mandat_ip: ip,
          }),
        });
        const maj = (await api(`prestataires?id=eq.${presta.id}&select=*`))?.[0];
        return page(pageMandat(maj, a));
      }

      if (!facture) return page(message("Action impossible", "Ce lien ne porte pas de facture."), 400);
      if (facture.statut !== "emise") return page(pageFacture(facture, presta, a));

      const maintenant = new Date().toISOString();
      const modif = action === "contester"
        ? { statut: "contestee", contestee_le: maintenant, ip_reponse: ip,
            motif_contestation: String(form.get("motif") || "").trim() || "Aucun motif précisé." }
        : { statut: "validee", validee_le: maintenant, ip_reponse: ip };

      await api(`prestataire_factures?id=eq.${facture.id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(modif),
      });
      const maj = (await api(`prestataire_factures?id=eq.${facture.id}&select=*`))?.[0];
      return page(pageFacture(maj, presta, a));
    }

    return json({ error: "Méthode non gérée." }, 405);
  } catch (e) {
    return page(message("Une erreur est survenue", String(e).slice(0, 200)), 500);
  }
});
