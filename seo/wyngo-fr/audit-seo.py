#!/usr/bin/env python3
"""Audit technique SEO de wyngo.fr — toutes les pages, contrôles réels."""
import json, re, ssl, time, urllib.request, gzip, io

PAGES = ["/", "/creation-site-internet-toulouse", "/prix-creation-site-internet-toulouse",
         "/referencement-local-google-toulouse", "/site-internet-artisan-commercant",
         "/refonte-site-internet-toulouse"]
BASE = "https://wyngo.fr"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36"
ctx = ssl.create_default_context()

def get(url, headers=None):
    h = {"User-Agent": UA, "Accept-Encoding": "gzip"}
    if headers: h.update(headers)
    req = urllib.request.Request(url, headers=h)
    t0 = time.time()
    try:
        r = urllib.request.urlopen(req, timeout=25, context=ctx)
        raw = r.read()
        dt = time.time() - t0
        if r.headers.get("Content-Encoding") == "gzip":
            raw = gzip.decompress(raw)
        return r.status, dict(r.headers), raw, dt, r.url
    except Exception as e:
        return None, {}, b"", time.time() - t0, url

pb = []          # problèmes
ok = []          # points conformes
titles, descs = {}, {}

# ── Redirections canoniques ──
for variant in ["http://wyngo.fr", "https://www.wyngo.fr"]:
    try:
        req = urllib.request.Request(variant, headers={"User-Agent": UA})
        r = urllib.request.urlopen(req, timeout=20, context=ctx)
        dest = r.url
        if dest.rstrip("/") == BASE:
            ok.append(f"{variant} redirige bien vers {BASE}")
        else:
            pb.append(("MAJEUR", f"{variant} aboutit à {dest} au lieu de {BASE}"))
    except Exception as e:
        pb.append(("MAJEUR", f"{variant} ne répond pas ({type(e).__name__}) — variante non redirigée"))

# ── 404 ──
st, _, body, _, _ = get(BASE + "/page-qui-nexiste-pas-xyz")
if st == 404: ok.append("Une URL inexistante renvoie bien un code 404")
else: pb.append(("MAJEUR", f"URL inexistante → code {st} au lieu de 404 (Google indexerait des pages fantômes)"))

# ── Par page ──
for p in PAGES:
    url = BASE + p
    st, hd, body, dt, final = get(url)
    if st != 200:
        pb.append(("CRITIQUE", f"{p} → HTTP {st}")); continue
    html = body.decode("utf-8", "ignore")
    poids = len(body)
    low = html.lower()

    if dt > 1.2: pb.append(("MAJEUR", f"{p} répond en {dt:.2f}s"))
    if poids > 250_000: pb.append(("MAJEUR", f"{p} pèse {poids//1024} Ko de HTML"))

    t = re.search(r"<title[^>]*>(.*?)</title>", html, re.S)
    t = t.group(1).strip() if t else ""
    d = re.search(r'<meta[^>]+name=["\']description["\'][^>]*content=["\'](.*?)["\']', html, re.S|re.I)
    d = d.group(1).strip() if d else ""
    if not t: pb.append(("CRITIQUE", f"{p} sans balise title"))
    elif len(t) > 65: pb.append(("MINEUR", f"{p} title de {len(t)} car. (tronqué par Google au-delà de ~60)"))
    if not d: pb.append(("MAJEUR", f"{p} sans meta description"))
    elif len(d) > 165: pb.append(("MINEUR", f"{p} meta description de {len(d)} car. (tronquée au-delà de ~160)"))
    if t in titles: pb.append(("MAJEUR", f"title identique entre {titles[t]} et {p}"))
    else: titles[t] = p
    if d and d in descs: pb.append(("MAJEUR", f"meta description identique entre {descs[d]} et {p}"))
    elif d: descs[d] = p

    h1 = re.findall(r"<h1[^>]*>(.*?)</h1>", html, re.S)
    if len(h1) == 0: pb.append(("CRITIQUE", f"{p} sans H1"))
    elif len(h1) > 1: pb.append(("MAJEUR", f"{p} contient {len(h1)} balises H1"))

    can = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]*href=["\'](.*?)["\']', html, re.I)
    if not can: pb.append(("MAJEUR", f"{p} sans canonical"))
    elif can.group(1).rstrip("/") != url.rstrip("/"):
        pb.append(("MAJEUR", f"{p} canonical pointe vers {can.group(1)}"))

    if "noindex" in low: pb.append(("CRITIQUE", f"{p} contient noindex — page exclue de Google"))
    if not re.search(r'<html[^>]+lang=', html, re.I): pb.append(("MINEUR", f"{p} sans attribut lang"))
    if not re.search(r'name=["\']viewport["\']', html, re.I): pb.append(("CRITIQUE", f"{p} sans viewport (cassé sur mobile)"))
    if not re.search(r'property=["\']og:image', html, re.I): pb.append(("MINEUR", f"{p} sans og:image (aperçu vide au partage)"))

    # images
    imgs = re.findall(r"<img\b[^>]*>", html, re.I)
    sans_alt = [i for i in imgs if not re.search(r'\balt=', i, re.I)]
    sans_lazy = [i for i in imgs if not re.search(r'loading=["\']lazy', i, re.I)]
    sans_dim = [i for i in imgs if not (re.search(r'\bwidth=', i, re.I) and re.search(r'\bheight=', i, re.I))]
    if imgs:
        if sans_alt: pb.append(("MAJEUR", f"{p} : {len(sans_alt)}/{len(imgs)} images sans attribut alt"))
        if len(sans_lazy) > 3: pb.append(("MINEUR", f"{p} : {len(sans_lazy)}/{len(imgs)} images sans chargement différé"))
        if len(sans_dim) > 3: pb.append(("MAJEUR", f"{p} : {len(sans_dim)}/{len(imgs)} images sans width/height (décalage visuel au chargement, pénalisé)"))

    # schéma
    blocs = re.findall(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>', html, re.S)
    if not blocs: pb.append(("MAJEUR", f"{p} sans données structurées"))
    for b in blocs:
        try: json.loads(b)
        except Exception as e: pb.append(("CRITIQUE", f"{p} : JSON-LD invalide ({e})"))

    # contenu
    texte = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S)
    mots = len(re.sub(r"<[^>]+>", " ", texte).split())
    if mots < 300: pb.append(("MAJEUR", f"{p} : seulement ~{mots} mots de contenu"))

    ok.append(f"{p} · {st} · {dt:.2f}s · {poids//1024} Ko · {mots} mots · {len(blocs)} schéma(s)")

# ── sitemap / robots ──
st, _, body, _, _ = get(BASE + "/sitemap.xml")
locs = re.findall(r"<loc>(.*?)</loc>", body.decode("utf-8", "ignore")) if st == 200 else []
manquantes = [BASE + p for p in PAGES if (BASE + p if p != "/" else BASE + "/") not in locs]
if st != 200: pb.append(("MAJEUR", "sitemap.xml absent"))
else:
    ok.append(f"sitemap.xml : {len(locs)} URLs")
    for u in locs:
        s2, _, _, _, _ = get(u)
        if s2 != 200: pb.append(("MAJEUR", f"sitemap déclare {u} qui renvoie {s2}"))

st, _, body, _, _ = get(BASE + "/robots.txt")
rob = body.decode("utf-8", "ignore") if st == 200 else ""
if "Sitemap:" not in rob: pb.append(("MINEUR", "robots.txt ne déclare pas le sitemap"))
if re.search(r"Disallow:\s*/\s*$", rob, re.M): pb.append(("CRITIQUE", "robots.txt bloque tout le site"))

# ── Rapport ──
print("=" * 74)
print("AUDIT TECHNIQUE — wyngo.fr")
print("=" * 74)
for lig in ok: print("  ✓", lig)
print()
rang = {"CRITIQUE": 0, "MAJEUR": 1, "MINEUR": 2}
pb.sort(key=lambda x: rang[x[0]])
if not pb:
    print("Aucun problème détecté.")
else:
    print(f"{len(pb)} PROBLÈMES\n")
    for sev, m in pb: print(f"  [{sev:<8}] {m}")
