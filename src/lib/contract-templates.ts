// ─── Générateur de contrats de prestation (droit français / UE) ───────
//
//  ⚠️ MODÈLES À TITRE INDICATIF — à faire valider par un professionnel du
//  droit avant usage. Couvrent les clauses usuelles obligatoires pour une
//  micro-entreprise (EI) vendant à des professionnels (TPE/artisans) :
//  mentions légales, prix/TVA, propriété intellectuelle, pénalités de
//  retard (art. L441-10 C. com.), droit de rétractation pro (art. L221-3
//  C. conso), RGPD, résiliation, droit applicable.
//
//  Le résultat (sections) est GELÉ dans contracts.body à la création :
//  le texte signé devient immuable.

export type ContractKind = "creation" | "abonnement";

export type ContractSettings = {
  legal_name?: string | null;
  trade_name?: string | null;
  legal_form?: string | null;
  is_ei?: boolean | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  siret?: string | null;
  vat_number?: string | null;
  vat_regime?: string | null; // 'franchise' | 'normal'
  email?: string | null;
  phone?: string | null;
  late_penalty?: string | null;
  custom_mentions?: string | null;
};

export type ContractClient = {
  client_name?: string | null;
  client_address?: string | null;
  client_postal_code?: string | null;
  client_city?: string | null;
  client_siret?: string | null;
  client_email?: string | null;
  client_is_pro?: boolean;
};

export type ContractParams = {
  // Création de site
  description?: string;       // objet / périmètre
  price_ht?: number;          // prix total HT
  deposit_pct?: number;       // acompte %
  delay_days?: number;        // délai indicatif de réalisation (jours)
  // Abonnement
  monthly_ht?: number;        // prix mensuel HT
  commitment_months?: number; // durée d'engagement initiale (mois)
  notice_days?: number;       // préavis de résiliation (jours)
  // Commun
  withdrawal?: boolean;       // proposer le droit de rétractation 14 j (client pro ≤5 salariés)
  jurisdiction_city?: string; // ville du tribunal compétent (siège prestataire)
};

export type ContractSection = { h: string; p: string[] };
export type ContractBody = { title: string; sections: ContractSection[]; disclaimer: string };

const eur = (n: number | undefined) =>
  (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

function sellerIdentity(s: ContractSettings): string {
  let n = (s.legal_name || "—").trim();
  if (s.is_ei && !/\bEI\b/i.test(n)) n += " (Entrepreneur Individuel)";
  const parts = [n];
  if (s.trade_name) parts.push(`exerçant sous le nom commercial « ${s.trade_name} »`);
  if (s.address || s.postal_code || s.city)
    parts.push(`dont le siège est situé ${[s.address, [s.postal_code, s.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}`);
  if (s.siret) parts.push(`immatriculée sous le numéro SIRET ${s.siret} (Registre National des Entreprises)`);
  const contact = [s.email, s.phone].filter(Boolean).join(" · ");
  if (contact) parts.push(`contact : ${contact}`);
  return parts.join(", ");
}

function clientIdentity(c: ContractClient): string {
  const parts = [(c.client_name || "—").trim()];
  const addr = [c.client_address, [c.client_postal_code, c.client_city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  if (addr) parts.push(`domicilié(e) ${addr}`);
  if (c.client_siret) parts.push(`SIRET ${c.client_siret}`);
  if (c.client_email) parts.push(`email : ${c.client_email}`);
  return parts.join(", ");
}

function taxMention(s: ContractSettings): string {
  return s.vat_regime === "normal"
    ? "Les prix s'entendent hors taxes ; la TVA au taux en vigueur est ajoutée sur les factures."
    : "TVA non applicable, article 293 B du Code général des impôts (franchise en base). Les prix indiqués sont nets, non soumis à TVA.";
}

// Clauses communes aux deux contrats (facturation, PI variable selon type…)
function commonTail(kind: ContractKind, s: ContractSettings, params: ContractParams): ContractSection[] {
  const city = params.jurisdiction_city || s.city || "du siège du Prestataire";
  const sections: ContractSection[] = [];

  // Obligation de moyens (facteurs extérieurs exclus) — clause clé demandée
  sections.push({
    h: "Obligation de moyens",
    p: [
      "Le Prestataire est tenu d'une obligation de moyens, et non de résultat : il met en œuvre tout son savoir-faire, son sérieux et sa diligence pour mener à bien la prestation et livrer un site conforme au périmètre convenu.",
      "Sa responsabilité ne saurait être engagée pour les dysfonctionnements, retards ou dommages imputables à des causes extérieures indépendantes de sa volonté, notamment : les défaillances, interruptions, suspensions ou modifications de services tiers (hébergeur, nom de domaine, fournisseur d'accès, plateformes, réseaux sociaux, services de paiement) ; les évolutions des algorithmes, règles ou politiques des moteurs de recherche (Google et autres) affectant le référencement, la visibilité ou le positionnement ; le fait, le retard, l'inexactitude ou la carence du Client (contenus, validations, accès non fournis en temps utile) ; les actes de tiers (piratage, malveillance, intrusion) ; et plus généralement tout événement échappant à son contrôle raisonnable.",
      "En particulier, le référencement, la visibilité et les performances en ligne dépendent de facteurs tiers : aucun résultat de positionnement, de trafic, de contacts ou de chiffre d'affaires ne peut être garanti par le Prestataire.",
    ],
  });

  // Pénalités de retard (obligatoire B2B)
  sections.push({
    h: "Retard de paiement",
    p: [
      "Toute somme non payée à l'échéance figurant sur la facture porte de plein droit, et sans mise en demeure préalable, des pénalités de retard calculées au taux d'intérêt appliqué par la Banque centrale européenne à son opération de refinancement la plus récente, majoré de 10 points de pourcentage.",
      "S'y ajoute une indemnité forfaitaire pour frais de recouvrement de 40 € (articles L441-10 et D441-5 du Code de commerce), sans préjudice de tout autre frais justifié.",
      s.late_penalty ? String(s.late_penalty) : "",
    ].filter(Boolean),
  });

  // Rétractation (client professionnel ≤ 5 salariés, hors champ d'activité principale)
  if (params.withdrawal !== false) {
    sections.push({
      h: "Droit de rétractation",
      p: [
        "Lorsque le Client est un professionnel employant cinq salariés au plus et que l'objet du présent contrat n'entre pas dans le champ de son activité principale, il dispose d'un délai de rétractation de quatorze (14) jours à compter de la signature, conformément à l'article L221-3 du Code de la consommation.",
        "Pour exercer ce droit, le Client notifie sa décision par une déclaration dénuée d'ambiguïté (courrier ou email à l'adresse du Prestataire) avant l'expiration du délai. Un formulaire type de rétractation est joint en annexe.",
        "Si le Client demande expressément que l'exécution de la prestation commence avant la fin du délai de rétractation, il reconnaît qu'en cas de rétractation il devra régler le montant correspondant aux prestations déjà fournies ; l'exécution intégrale avant la fin du délai emporte renonciation au droit de rétractation.",
      ],
    });
  }

  sections.push({
    h: "Confidentialité",
    p: ["Chaque partie s'engage à conserver confidentielles les informations et documents non publics échangés dans le cadre du contrat, pendant sa durée et deux (2) ans après son terme."],
  });

  sections.push({
    h: "Données personnelles (RGPD)",
    p: [
      "Chaque partie s'engage à respecter le Règlement (UE) 2016/679 (RGPD) et la loi Informatique et Libertés pour les traitements de données personnelles réalisés dans le cadre du contrat.",
      "Lorsque le Prestataire traite des données personnelles pour le compte du Client (ex. hébergement, formulaires du site), il agit en qualité de sous-traitant : il ne traite ces données que sur instruction du Client, met en œuvre des mesures de sécurité appropriées et les restitue ou supprime en fin de contrat. Un accord de traitement (DPA) peut être établi à la demande.",
    ],
  });

  sections.push({
    h: "Responsabilité",
    p: [
      "Le Prestataire est tenu d'une obligation de moyens. Sa responsabilité ne saurait être engagée pour les dommages indirects, ni au-delà du montant total effectivement payé par le Client au titre du contrat au cours des douze (12) derniers mois.",
      "Le Client demeure seul responsable des contenus (textes, images, données) qu'il fournit et de leur conformité au droit (droits d'auteur, marques, mentions légales, etc.).",
    ],
  });

  sections.push({
    h: "Force majeure",
    p: ["Aucune partie ne peut être tenue responsable d'un manquement résultant d'un cas de force majeure au sens de l'article 1218 du Code civil. Les obligations sont suspendues pendant la durée de l'événement."],
  });

  sections.push({
    h: "Droit applicable et litiges",
    p: [
      "Le présent contrat est soumis au droit français.",
      "En cas de différend, les parties s'efforceront de trouver une solution amiable avant toute action. À défaut d'accord, le litige sera porté devant le tribunal compétent du ressort de " + city + ".",
    ],
  });

  return sections;
}

function signatureNote(): ContractSection {
  return {
    h: "Acceptation et signature",
    p: [
      "Le présent contrat est établi en deux exemplaires (ou signé électroniquement, la signature électronique ayant valeur probante conformément au règlement eIDAS n° 910/2014 et aux articles 1366 et 1367 du Code civil).",
      "Fait pour valoir ce que de droit. Le Client déclare avoir pris connaissance de l'ensemble des clauses et les accepter sans réserve (mention « Lu et approuvé »).",
    ],
  };
}

export function buildContract(
  kind: ContractKind,
  s: ContractSettings,
  c: ContractClient,
  params: ContractParams,
): ContractBody {
  const seller = sellerIdentity(s);
  const client = clientIdentity(c);
  const disclaimer = "";

  if (kind === "abonnement") {
    const commitment = Number(params.commitment_months) || 12;
    const notice = Number(params.notice_days) || 30;
    const monthly = Number(params.monthly_ht) || 0;
    const sections: ContractSection[] = [
      { h: "Entre les soussignés", p: [
        `LE PRESTATAIRE : ${seller}, ci-après « le Prestataire ».`,
        `LE CLIENT : ${client}, ci-après « le Client ».`,
      ] },
      { h: "Article 1 — Objet", p: [
        "Le présent contrat a pour objet la fourniture, par le Prestataire, de prestations récurrentes de suivi de la présence en ligne du Client : référencement (SEO), maintenance technique, mises à jour, corrections, et suivi/reporting.",
        params.description ? `Périmètre convenu : ${params.description}` : "Le périmètre précis des prestations est défini d'un commun accord et peut être détaillé en annexe ou dans le devis associé.",
      ] },
      { h: "Article 2 — Durée, reconduction et résiliation", p: [
        `Le contrat est conclu pour une durée d'engagement initiale de ${commitment} mois à compter de sa signature.`,
        "À l'issue de cette période, il se poursuit par tacite reconduction par périodes successives d'un (1) mois, sauf résiliation par l'une des parties.",
        `Chaque partie peut résilier moyennant un préavis de ${notice} jours notifié par écrit (email ou courrier). Les prestations engagées et le mois en cours restent dus.`,
        "En cas de manquement grave d'une partie, l'autre peut résilier de plein droit après mise en demeure restée sans effet pendant quinze (15) jours.",
      ] },
      { h: "Article 3 — Prix et facturation", p: [
        `Le prix des prestations est de ${eur(monthly)} par mois. ${taxMention(s)}`,
        "Les prestations sont facturées mensuellement, à terme échu ou à échoir selon accord. Le paiement intervient à réception de facture, selon les modalités convenues.",
      ] },
      { h: "Article 4 — Obligations du Prestataire", p: [
        "Le Prestataire exécute les prestations avec diligence et selon les règles de l'art, informe le Client de l'avancement et reste joignable pour les demandes courantes.",
        "Le référencement relève d'une obligation de moyens : aucun positionnement précis dans les moteurs de recherche ne peut être garanti, ceux-ci dépendant d'algorithmes tiers.",
      ] },
      { h: "Article 5 — Obligations du Client", p: [
        "Le Client fournit en temps utile les accès, contenus et validations nécessaires, règle les factures aux échéances, et désigne un interlocuteur unique.",
      ] },
      { h: "Article 6 — Propriété, accès et réversibilité", p: [
        "Le Client reste propriétaire de son site, de son nom de domaine, de ses contenus et de ses comptes. Le Prestataire agit sur mandat.",
        "En fin de contrat, le Prestataire restitue les accès et les éléments propres au Client et supprime, à la demande, les accès dont il disposait.",
      ] },
      { h: "Article 7 — Hébergement et nom de domaine", p: [
        "Sauf stipulation contraire, l'hébergement et le nom de domaine sont souscrits au nom et aux frais du Client. Le Prestataire peut en assurer la gestion pour le compte du Client dans le cadre du présent contrat.",
      ] },
      ...commonTail("abonnement", s, params),
      signatureNote(),
    ];
    return { title: "Contrat d'abonnement — suivi et référencement", sections, disclaimer };
  }

  // ── Création de site (prestation ponctuelle) ──
  const price = Number(params.price_ht) || 0;
  const depPct = Number(params.deposit_pct) || 30;
  const deposit = Math.round(price * depPct) / 100;
  const delay = Number(params.delay_days) || 30;
  const sections: ContractSection[] = [
    { h: "Entre les soussignés", p: [
      `LE PRESTATAIRE : ${seller}, ci-après « le Prestataire ».`,
      `LE CLIENT : ${client}, ci-après « le Client ».`,
    ] },
    { h: "Article 1 — Objet", p: [
      "Le présent contrat a pour objet la conception et la réalisation, par le Prestataire, d'un site internet pour le compte du Client.",
      params.description ? `Périmètre convenu : ${params.description}` : "Le périmètre détaillé (pages, fonctionnalités, contenus) est défini d'un commun accord et peut figurer en annexe ou dans le devis associé, qui fait partie intégrante du contrat.",
    ] },
    { h: "Article 2 — Prix et modalités de paiement", p: [
      `Le prix de la prestation est de ${eur(price)}. ${taxMention(s)}`,
      `Un acompte de ${depPct} % (soit ${eur(deposit)}) est versé à la signature ; le solde est exigible à la livraison du site.`,
      "À défaut de paiement de l'acompte, le Prestataire n'est pas tenu de débuter les travaux.",
    ] },
    { h: "Article 3 — Délais de réalisation", p: [
      `Le Prestataire s'efforce de livrer le site dans un délai indicatif de ${delay} jours à compter de la réception de l'acompte et de l'ensemble des éléments (contenus, accès, validations) nécessaires.`,
      "Ce délai est suspendu tant que le Client n'a pas fourni les éléments requis ou n'a pas validé les étapes soumises.",
    ] },
    { h: "Article 4 — Obligations des parties", p: [
      "Le Prestataire réalise la prestation selon les règles de l'art et tient le Client informé de l'avancement.",
      "Le Client fournit en temps utile les contenus (textes, images, logos) dont il détient les droits, les accès nécessaires, et valide les étapes soumises.",
    ] },
    { h: "Article 5 — Recette et livraison", p: [
      "À la livraison, le Client dispose de sept (7) jours pour signaler par écrit d'éventuelles non-conformités au périmètre convenu. Passé ce délai sans réserve, le site est réputé accepté.",
      "Les demandes hors périmètre initial font l'objet d'un devis complémentaire.",
    ] },
    { h: "Article 6 — Propriété intellectuelle", p: [
      "Les droits d'exploitation sur les créations spécifiquement réalisées pour le Client (design, contenus produits par le Prestataire) lui sont cédés après paiement intégral du prix.",
      "Le Prestataire conserve la propriété de ses outils, briques logicielles et savoir-faire réutilisables, ainsi que le droit de citer la réalisation dans ses références (portfolio), sauf opposition écrite du Client.",
      "Les éléments soumis à licence de tiers (polices, images de banque, extensions) restent régis par leurs licences respectives.",
    ] },
    { h: "Article 7 — Hébergement, nom de domaine et maintenance", p: [
      "Sauf stipulation contraire, l'hébergement et le nom de domaine sont souscrits au nom et aux frais du Client.",
      "La maintenance, les mises à jour et le référencement postérieurs à la livraison ne sont pas inclus ; ils peuvent faire l'objet d'un contrat d'abonnement distinct.",
    ] },
    ...commonTail("creation", s, params),
    signatureNote(),
  ];
  return { title: "Contrat de création de site internet", sections, disclaimer };
}
