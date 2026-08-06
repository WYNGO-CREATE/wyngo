/**
 * ─── La balise servie comme un fichier ────────────────────────────────
 *
 * Pour un site que nous hébergeons, la balise est injectée dans le HTML à la
 * publication. Pour un site fabriqué ailleurs, on ne peut pas injecter : il
 * faut donner au client — ou à son webmaster — une seule ligne à coller.
 *
 * Cette fonction sert donc le même script, avec l'identifiant du site déjà
 * dedans. Une ligne à coller, rien à configurer, et si l'on change la mesure
 * demain tous les sites en profitent sans qu'on y retouche.
 *
 * Publique par nature : c'est un fichier de script appelé par le navigateur
 * d'un visiteur anonyme.
 */

import { baliseMesure } from "../_shared/balise-mesure.ts";

const URL_SB = Deno.env.get("SUPABASE_URL")!;

Deno.serve((req) => {
  const site = new URL(req.url).searchParams.get("s") ?? "";
  const entetes = {
    "Content-Type": "application/javascript; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    // Une heure : assez pour ne pas être rechargé à chaque page, assez court
    // pour qu'un correctif se propage dans la journée.
    "Cache-Control": "public, max-age=3600",
  };

  if (!/^[0-9a-f-]{36}$/i.test(site)) {
    return new Response("/* Identifiant de site absent ou invalide */", { headers: entetes });
  }

  // baliseMesure renvoie un <script>…</script> destiné à être injecté dans une
  // page. Servi comme fichier, il faut retirer ces balises.
  const nu = baliseMesure(site, `${URL_SB}/functions/v1/mesure`)
    .replace(/^<script>/, "")
    .replace(/<\/script>$/, "");

  return new Response(nu, { headers: entetes });
});
