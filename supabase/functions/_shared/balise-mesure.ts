/**
 * ─── La balise de mesure posée sur les sites clients ──────────────────
 *
 * Environ 1,4 Ko, sans dépendance, sans cookie. Elle est injectée par
 * site-publish dans chaque page publiée.
 *
 * Ce qu'elle observe, dans cet ordre d'importance pour un commerçant :
 *   1. les clics sur le téléphone, l'email, l'itinéraire, WhatsApp, et les
 *      envois de formulaire — ce sont les seules choses qui rapportent ;
 *   2. les pages vues et la provenance ;
 *   3. le temps passé et la profondeur de lecture.
 *
 * Trois précautions :
 *   • tout est enveloppé dans un try : une mesure qui casse ne doit jamais
 *     casser le site d'un client ;
 *   • l'envoi final passe par sendBeacon, qui survit à la fermeture de
 *     l'onglet — sans lui on perdrait le temps passé sur la dernière page ;
 *   • aucune donnée saisie dans un formulaire n'est lue, seulement le fait
 *     qu'il a été envoyé.
 */

export function baliseMesure(siteId: string, urlCollecteur: string): string {
  return `<script>(function(){try{
var S=${JSON.stringify(siteId)},U=${JSON.stringify(urlCollecteur)};
if(navigator.doNotTrack==="1"||window.__ga_mesure)return;window.__ga_mesure=1;
var V=sessionStorage.getItem("ga_v");if(!V){V=Math.random().toString(36).slice(2)+Date.now().toString(36);try{sessionStorage.setItem("ga_v",V)}catch(e){}}
var Q=new URLSearchParams(location.search);
var base={s:S,v:V,u:location.href,t:document.title,r:document.referrer||"",
us:Q.get("utm_source"),um:Q.get("utm_medium"),uc:Q.get("utm_campaign")};
function env(o,fin){try{var d=JSON.stringify(Object.assign({},base,o));
if(fin&&navigator.sendBeacon){navigator.sendBeacon(U,new Blob([d],{type:"text/plain"}))}
else{fetch(U,{method:"POST",body:d,keepalive:true,headers:{"Content-Type":"application/json"}}).catch(function(){})}}catch(e){}}
env({e:"page"});
var t0=Date.now(),pmax=0;
function prof(){try{var h=document.documentElement,p=Math.round((h.scrollTop+innerHeight)/h.scrollHeight*100);if(p>pmax)pmax=Math.min(p,100)}catch(e){}}
addEventListener("scroll",prof,{passive:true});prof();
document.addEventListener("click",function(ev){try{
var a=ev.target&&ev.target.closest&&ev.target.closest("a");if(!a)return;
var h=(a.getAttribute("href")||"").trim(),g=null;
if(/^tel:/i.test(h))g="telephone";
else if(/^mailto:/i.test(h))g="email";
else if(/^https?:\\/\\/(wa\\.me|api\\.whatsapp)/i.test(h))g="whatsapp";
else if(/(google\\.[a-z.]+\\/maps|maps\\.app\\.goo\\.gl|waze\\.com|apple\\.com\\/maps)/i.test(h))g="itineraire";
else if(/^https?:/i.test(h)&&h.indexOf(location.hostname)===-1)g="lien_sortant";
if(g)env({e:g,x:{lien:h.slice(0,180)}})}catch(e){}},true);
document.addEventListener("submit",function(ev){try{
var f=ev.target;env({e:"formulaire",x:{form:(f&&(f.getAttribute("name")||f.getAttribute("id")))||"principal"}})}catch(e){}},true);
addEventListener("visibilitychange",function(){if(document.visibilityState==="hidden")
env({e:"sortie",d:Math.round((Date.now()-t0)/1000),p:pmax},true)});
addEventListener("pagehide",function(){env({e:"sortie",d:Math.round((Date.now()-t0)/1000),p:pmax},true)});
}catch(e){}})();</script>`;
}
