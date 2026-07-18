/* =====================================================================
   api-config.js — résolution de l'API pour la Console marque (franchisor)
   =====================================================================
   Même convention que le WebShop : l'API PHP est servie en same-origin.
   Le franchisor vit à  <origin>/webshop/backoffice_franchisor/  → l'API
   partagée est à  <origin>/webshop/api  (les MÊMES endpoints/base que le
   webshop et le franchisee : donnée partagée = source unique).

   • Sur *.github.io ou si l'API ne répond pas → mode démo (seed en mémoire).
   • Le jeton admin est partagé par origine (localStorage 'adminToken'),
     donc si l'admin s'est connecté au back-office webshop, le franchisor
     le réutilise automatiquement.
   • Overrides de test :  ?api=<baseUrl>  et  ?token=<adminToken>.
   ===================================================================== */
(function () {
  var onGitHubPages = /\.github\.io$/i.test(location.hostname);

  // Base du webshop : on retire le segment /backoffice_franchisor/... pour
  // retomber sur .../webshop, puis on ajoute /api.
  var path = location.pathname;
  var m = path.match(/^(.*?)\/backoffice_franchisor(?:\/|$)/);
  var webshopBase = m ? m[1] : path.replace(/[^/]*$/, '').replace(/\/$/, '');
  var base = onGitHubPages ? null : (location.origin + webshopBase + '/api');

  var token = '';
  try { token = localStorage.getItem('adminToken') || ''; } catch (e) {}

  // Overrides explicites par query (tests / première connexion).
  try {
    var q = new URLSearchParams(location.search);
    if (q.get('api')) base = q.get('api');
    if (q.get('token')) { token = q.get('token'); try { localStorage.setItem('adminToken', token); } catch (e) {} }
  } catch (e) {}

  window.__FR = { base: base, token: token };
})();
