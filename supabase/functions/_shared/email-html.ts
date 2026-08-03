/**
 * ─── Builder d'email HTML avec signature + logo ───
 *
 * Utilisé par gmail-send et workflow-tick.
 *
 * Design choices (Principal Engineer) :
 *   1. Pas d'image SVG ni base64 → email clients (Outlook, Gmail) bloquent.
 *      Logo en pur texte CSS-stylé = rendu identique partout, indexable, accessible.
 *   2. Tables HTML imbriquées (vieille école mais OBLIGATOIRE pour Outlook).
 *   3. Largeur max 600px, alignement gauche, fond blanc — code-safe.
 *   4. Multipart MIME text/plain + text/html → si le client ne supporte pas HTML,
 *      fallback texte propre.
 */

export interface EmailSignatureData {
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  agencyName?: string;
  agencyWebsite?: string;
  agencyLogoUrl?: string;     // si défini, override le wordmark texte par une image
  agencyTagline?: string;     // ex : "Cabinet privé de création digitale"
}

/**
 * Rend le HTML complet d'un email (corps + signature avec wordmark).
 * Garde la mise en forme défensive (tables) pour Outlook.
 */
export function buildEmailHtml(bodyText: string, sig: EmailSignatureData): string {
  const escapedBody = escapeHtml(bodyText).replace(/\n/g, "<br>");
  const signatureHtml = buildSignatureHtml(sig);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Email</title>
</head>
<body style="margin:0; padding:0; background-color:#ffffff; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#1a1a1a; line-height:1.65;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;">
  <tr>
    <td align="center" style="padding: 24px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px; width:100%;">
        <tr>
          <td style="font-size:15px; color:#1a1a1a; line-height:1.7;">
            ${escapedBody}
          </td>
        </tr>
        <tr><td style="height:32px; line-height:32px; font-size:0;">&nbsp;</td></tr>
        <tr>
          <td>${signatureHtml}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * Construit la signature HTML.
 * Si agencyLogoUrl est fourni → utilise l'image.
 * Sinon → wordmark texte stylé (rendu identique sur tous les clients).
 */
function buildSignatureHtml(sig: EmailSignatureData): string {
  const {
    senderName,
    senderEmail,
    senderPhone,
    agencyName = "Group Arsène",
    agencyWebsite,
    agencyLogoUrl,
    agencyTagline = "Cabinet privé de création digitale",
  } = sig;

  // ─── Logo : image hostée OU wordmark texte ───
  const logoCell = agencyLogoUrl
    ? `<img src="${escapeAttr(agencyLogoUrl)}" alt="${escapeAttr(agencyName)}" width="120" style="display:block; max-width:120px; height:auto; border:0;" />`
    : renderWordmark(agencyName, agencyTagline);

  const contactLines: string[] = [];
  if (senderName) {
    contactLines.push(`<div style="font-size:14px; font-weight:600; color:#1a1a1a; margin-bottom:2px;">${escapeHtml(senderName)}</div>`);
  }
  if (agencyName && !agencyLogoUrl) {
    // déjà dans le wordmark
  } else if (agencyName) {
    contactLines.push(`<div style="font-size:12px; color:#4a4a4a;">${escapeHtml(agencyName)}</div>`);
  }
  if (senderEmail) {
    contactLines.push(`<div style="font-size:12px; color:#4a4a4a; margin-top:2px;"><a href="mailto:${escapeAttr(senderEmail)}" style="color:#4a4a4a; text-decoration:none;">${escapeHtml(senderEmail)}</a></div>`);
  }
  if (senderPhone) {
    contactLines.push(`<div style="font-size:12px; color:#4a4a4a;">${escapeHtml(senderPhone)}</div>`);
  }
  if (agencyWebsite) {
    const cleanUrl = agencyWebsite.startsWith("http") ? agencyWebsite : `https://${agencyWebsite}`;
    const displayUrl = agencyWebsite.replace(/^https?:\/\//, "");
    contactLines.push(`<div style="font-size:12px; color:#4a4a4a; margin-top:2px;"><a href="${escapeAttr(cleanUrl)}" style="color:#4a4a4a; text-decoration:none;">${escapeHtml(displayUrl)}</a></div>`);
  }

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e5e5e5; padding-top:20px;">
  <tr>
    <td style="padding-bottom:12px;">${logoCell}</td>
  </tr>
  <tr>
    <td>${contactLines.join("")}</td>
  </tr>
</table>`;
}

/**
 * Wordmark texte stylé : "Wyngo." en serif fin + tagline en sans gris clair.
 * Inspiré des en-têtes de publications (Le Monde, FT, etc.) — sobre et premium.
 */
function renderWordmark(name: string, tagline?: string): string {
  return `<div>
  <span style="
    display:inline-block;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 28px;
    font-weight: 400;
    letter-spacing: -0.5px;
    color: #0a0a0a;
    line-height: 1;
  ">${escapeHtml(name)}<span style="color:#b8997f;">.</span></span>
${tagline ? `<div style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:10px; letter-spacing:1.2px; text-transform:uppercase; color:#8a8a8a; margin-top:6px; font-weight:500;">${escapeHtml(tagline)}</div>` : ""}
</div>`;
}

/**
 * ─── Gabarit d'email transactionnel premium (partagé) ─────────────────
 * Utilisé pour les envois de devis, factures et contrats. Design sobre et
 * professionnel : carte blanche, en-tête marque, bouton d'action net,
 * pied de page discret. Police système (identique partout). Aucune flèche
 * ni caractère décoratif fragile. `intro` et `contentHtml` sont du HTML déjà
 * assaini par l'appelant ; `footerLines` sont des chaînes déjà échappées.
 */
export function transactionalEmail(opts: {
  brand: string;
  greetingName?: string | null;
  intro: string;            // HTML sûr (paragraphe d'intro)
  contentHtml?: string;     // bloc optionnel (ex. lignes d'un devis)
  ctaUrl: string;
  ctaLabel: string;
  footerLines?: string[];   // déjà échappées
  accent?: string;
}): string {
  const accent = opts.accent || "#1B4BE3";
  const brand = escapeHtml(opts.brand || "Wyngo");
  const greeting = opts.greetingName ? `Bonjour ${escapeHtml(opts.greetingName)},` : "Bonjour,";
  const footer = (opts.footerLines || []).filter(Boolean).join("<br>");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;"><tr><td align="center" style="padding:32px 14px;">
  <table role="presentation" width="548" cellpadding="0" cellspacing="0" border="0" style="max-width:548px;width:100%;background:#ffffff;border:1px solid #ececf0;border-radius:18px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,.06);">
    <tr><td style="padding:28px 34px 0 34px;">
      <div style="font-size:17px;font-weight:700;letter-spacing:.02em;color:#0f172a;">${brand}</div>
      <div style="height:3px;width:34px;background:${accent};border-radius:3px;margin-top:9px;"></div>
    </td></tr>
    <tr><td style="padding:22px 34px 4px 34px;">
      <p style="margin:0 0 14px;font-size:15px;color:#111827;">${greeting}</p>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#374151;">${opts.intro}</p>
      ${opts.contentHtml || ""}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;"><tr>
        <td style="border-radius:12px;background:${accent};">
          <a href="${escapeAttr(opts.ctaUrl)}" target="_blank" style="display:inline-block;padding:15px 34px;color:#ffffff;font-size:15px;font-weight:600;letter-spacing:.01em;text-decoration:none;border-radius:12px;">${escapeHtml(opts.ctaLabel)}</a>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:20px 34px 24px 34px;">
      <div style="border-top:1px solid #f1f2f4;padding-top:16px;font-size:12px;line-height:1.6;color:#98a2b3;">${footer}</div>
    </td></tr>
  </table>
  <div style="font-size:11px;color:#c0c4cc;margin-top:16px;">Transmis avec Wyngo</div>
</td></tr></table>
</body></html>`;
}

/**
 * Construit la version texte plein de l'email (fallback pour clients qui ne lisent pas HTML).
 */
export function buildEmailText(bodyText: string, sig: EmailSignatureData): string {
  const lines = [bodyText.trim(), ""];
  lines.push("--");
  if (sig.senderName) lines.push(sig.senderName);
  if (sig.agencyName) lines.push(sig.agencyName);
  if (sig.senderEmail) lines.push(sig.senderEmail);
  if (sig.senderPhone) lines.push(sig.senderPhone);
  if (sig.agencyWebsite) lines.push(sig.agencyWebsite);
  return lines.join("\n");
}

/**
 * Construit le payload MIME multipart text/plain + text/html
 * encodé en base64-url pour l'API Gmail.
 */
export function buildRawMultipartEmail(opts: {
  from: string;
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  in_reply_to?: string;
}): string {
  const boundary = `wyngo_${Math.random().toString(36).slice(2)}_${Date.now()}`;

  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(opts.subject)))}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  if (opts.in_reply_to) {
    headers.push(`In-Reply-To: ${opts.in_reply_to}`);
    headers.push(`References: ${opts.in_reply_to}`);
  }

  const parts = [
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    "",
    qpEncode(opts.textBody),
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    "",
    qpEncode(opts.htmlBody),
    "",
    `--${boundary}--`,
  ];

  const raw = headers.join("\r\n") + "\r\n\r\n" + parts.join("\r\n");
  return base64UrlEncode(raw);
}

// ─── Utils ───
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}

function base64UrlEncode(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Quoted-printable encoding pour MIME — gère accents et longues lignes proprement.
 *  Les retours à la ligne "soft" (=\r\n) ne coupent JAMAIS une séquence =XX :
 *  on tokenise d'abord (chaque octet = 1 token littéral ou "=XX"), puis on
 *  emballe les tokens sans dépasser 76 colonnes. Corrige la corruption des
 *  caractères multi-octets (ex. « → » = =E2=86=92) découpés en plein milieu. */
function qpEncode(text: string): string {
  const bytes = unescape(encodeURIComponent(text));
  const tokens: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes.charCodeAt(i);
    if (c === 13 || c === 10) tokens.push(bytes[i]);           // CR / LF littéraux
    else if (c < 32 || c === 61 || c > 126) tokens.push("=" + c.toString(16).toUpperCase().padStart(2, "0"));
    else tokens.push(bytes[i]);
  }
  let out = "";
  let lineLen = 0;
  for (const tk of tokens) {
    if (tk === "\r" || tk === "\n") { out += tk; lineLen = 0; continue; }
    if (lineLen + tk.length > 75) { out += "=\r\n"; lineLen = 0; }
    out += tk; lineLen += tk.length;
  }
  return out;
}
