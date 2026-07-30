// Couche de données du back office marque (franchisor).
// RÈGLE GO-LIVE : AUCUNE donnée de démonstration, AUCUN repli. Les tables
// partent VIDES et sont remplies exclusivement par l'API (/franchisor/*).
// Toute panne (API absente, jeton manquant, 401/500/réseau) est AFFICHÉE par
// le bandeau d'erreur (« error please debug ») — jamais un écran qui fait
// semblant avec des chiffres inventés. Seules restent les CONFIGS d'écran
// (params par défaut, gabarits d'emails) — des textes d'interface, pas des
// données métier.
(function(){
  // v3 : purge go-live — invalide les caches localStorage du seed de démo
  // (KPIs 428 k€, boutiques fictives bxl/and/ucc, clients Le Cirio & co).
  var LS = 'ws_bo_store_v3';
  var SEED = {
    "erp_portions": [],
    "kpis": [],
    "catchment": [],
    "shops": [],
    "catalog": [],
    "vouchers": [],
    "pricing_rules": [],
    "params": [
      {cle:'admin.schema_reports',type:'bool',def:true},
      {cle:'webshop.enabled',type:'bool',def:true},
      {cle:'nav.icon_back',type:'text',val:'arrow-left'},
      {cle:'delivery.enabled',type:'bool',def:true},
      {cle:'order.cutoff_default',type:'text',val:'17:00'},
      {cle:'brand.support_url',type:'text',val:'https://aide.latelierby.be'},
    ],
    "email_templates": [
      {cle:'order_confirm',langue:'FR',sujet:'Votre commande {{commande_ref}} est confirmée'},
      {cle:'order_ready',langue:'FR',sujet:'Votre commande est prête'},
      {cle:'invoice',langue:'FR',sujet:'Facture {{commande_ref}}'},
      {cle:'office_onboarding',langue:'FR',sujet:'Bienvenue — votre compte {{bureau}}'},
      {cle:'office_reject',langue:'FR',sujet:'Votre demande de rattachement'},
    ],
    "users": [],
    "audit": [],
    "fr_alertes": [],
    "fr_live_drivers": [],
    "fr_clients": [],
    "fr_incidents": [],
    "fr_rentabilite": [],
    "prospects": [],
  };
  var DB = null;
  function read(){ try { var r = localStorage.getItem(LS); if (r) return JSON.parse(r); } catch(e){} return null; }
  function persist(){ try { localStorage.setItem(LS, JSON.stringify(DB)); } catch(e){} return DB; }
  function ensure(){ if (DB) return DB; DB = read(); if (!DB){ DB = JSON.parse(JSON.stringify(SEED)); } else { for (var k in SEED){ if (!(k in DB)) DB[k] = JSON.parse(JSON.stringify(SEED[k])); } } persist(); return DB; }
  // ── Erreurs de chargement/écriture : AFFICHÉES, jamais avalées. ──
  var ERRORS = [];
  function noteError(kind, detail){
    ERRORS.push({ kind: kind, detail: detail, at: new Date().toISOString() });
    try { if (typeof window !== 'undefined' && window.__BO_RENDER_ERRORS) window.__BO_RENDER_ERRORS(ERRORS); } catch(e){}
  }
  window.BOServer = {
    table: function(n){ var db = ensure(); return db[n] ? JSON.parse(JSON.stringify(db[n])) : []; },
    all: function(){ return JSON.parse(JSON.stringify(ensure())); },
    getParam: function(key, dflt){ var db = ensure(); var rows = db.params || []; for (var i=0;i<rows.length;i++){ if (rows[i].cle===key){ var r=rows[i]; return (r.val!==undefined ? r.val : (r.def!==undefined ? r.def : dflt)); } } return dflt; },
    setParam: function(key, val){ ensure(); var rows = DB.params || (DB.params = []); var found=false; for (var i=0;i<rows.length;i++){ if (rows[i].cle===key){ rows[i].val=val; found=true; } } if (!found) rows.push({cle:key, type:'bool', val:val}); return persist(); },
    save: function(n, rows){ ensure(); DB[n] = JSON.parse(JSON.stringify(rows)); return persist(); },
    reset: function(){ DB = JSON.parse(JSON.stringify(SEED)); return persist(); },
    loadErrors: ERRORS,
    // Charge la vraie donnée depuis l'API PHP (/franchisor/*) EN MÉMOIRE.
    // La réponse API fait foi MÊME VIDE ; une table en échec est VIDÉE et
    // l'échec est AFFICHÉ — plus jamais de « garde le seed » silencieux.
    hydrate: function(){
      var fr = (typeof window !== 'undefined' && window.__FR) || {};
      if (!fr.base) {
        noteError('fatal', 'API non configurée (window.__FR.base absent) — aucun chargement possible.');
        return Promise.resolve(false);
      }
      if (!fr.token) {
        noteError('fatal', 'Jeton admin manquant — aucune donnée ne peut charger. Ouvrez la console avec ?token=<jeton admin> (il sera mémorisé).');
        return Promise.resolve(false);
      }
      ensure();
      var MAP = { catchment:'catchment', kpis:'kpis', shops:'shops', catalog:'catalog', vouchers:'vouchers',
                  pricing_rules:'pricing-rules', erp_portions:'erp-portion-rules', params:'params', prospects:'prospects',
                  email_templates:'email-templates', users:'users', audit:'audit' };
      // CONFIGS d'écran : une réponse vide ne les écrase pas (textes d'UI).
      var CONFIG = { params:1, email_templates:1 };
      var headers = { 'X-Admin-Token': fr.token };
      var failed = [];
      var jobs = Object.keys(MAP).map(function(key){
        return fetch(fr.base + '/franchisor/' + MAP[key], { headers: headers, credentials: 'omit' })
          .then(function(r){
            if (!r.ok) { failed.push(key + ' (HTTP ' + r.status + ')'); DB[key] = CONFIG[key] ? DB[key] : []; return null; }
            return r.json().then(function(data){
              if (Array.isArray(data) && (data.length || !CONFIG[key])) DB[key] = data;
              return null;
            });
          })
          .catch(function(){ failed.push(key + ' (réseau/JSON)'); if (!CONFIG[key]) DB[key] = []; });
      });
      return Promise.all(jobs).then(function(){
        if (failed.length) {
          var auth = failed.join(' ').indexOf('HTTP 401') >= 0;
          noteError('chargement', failed.length + ' chargement(s) en échec — please debug : ' + failed.join(', ') +
            (auth ? '  ⇒ HTTP 401 = jeton admin invalide/absent : rouvrez la console avec ?token=<jeton admin>.' : ''));
        }
        return !failed.length;
      });
    }
  };
})();
