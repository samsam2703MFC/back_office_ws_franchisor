"use strict";
/* ==========================================================================
   L'Atelier By — Console marque (franchiseur) · back_office_ws_franchisor
   Standalone vanilla-JS implementation of the design component.

   A tiny state container renders the whole page on every setState, mirroring
   the reactive behaviour of the original design prototype. Every colour, font
   and spacing value flows from the design-system CSS variables.
   ========================================================================== */

/* ----- accent constants (from the design system's admin palette) ---------- */
var APRICOT = '#E8A15C';
var COPPER  = '#8C4A2F';

/* ----- state ------------------------------------------------------------- */
var state = {
  screen: 'dash',            // active nav screen
  flags: {},                 // toggles + inline edits, keyed by id
  paramNavOpen: false,       // "Paramétrage" nav group collapsed by default
  formKey: null,             // active modal form key (null = closed)
  formVals: {},              // working values for the modal form
  formEdit: false,           // edit vs create mode
  toast: ''                  // transient confirmation message
};
var toastTimer = null;

function setState(patch){
  if (typeof patch === 'function') patch = patch(state);
  Object.assign(state, patch);
  render();
}

/* ----- helpers ----------------------------------------------------------- */
function eur(n){ return n.toLocaleString('fr-BE', { minimumFractionDigits: 0 }) + ' €'; }

function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function pill(bg, c){
  return 'display:inline-flex;align-items:center;font:600 10px var(--font-ui);border-radius:20px;'
       + 'padding:4px 10px;background:' + bg + ';color:' + c;
}

function dot(c){ return 'width:7px;height:7px;border-radius:50%;flex:none;background:' + c; }

/* toggle descriptor — reads current value from flags, falling back to default */
function tog(key, def){
  var on = state.flags[key] !== undefined ? state.flags[key] : def;
  return {
    on: on,
    style: 'position:relative;width:38px;height:21px;border-radius:20px;border:none;cursor:pointer;'
         + 'background:' + (on ? 'var(--color-primary)' : 'var(--color-border-secondary)'),
    knob: 'position:absolute;top:2px;left:' + (on ? '19px' : '2px') + ';width:17px;height:17px;'
        + 'border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2)',
    key: key, def: def
  };
}
function flipFlag(key, def){
  setState(function(st){
    var cur = st.flags[key] !== undefined ? st.flags[key] : def;
    var next = {}; next[key] = !cur;
    return { flags: Object.assign({}, st.flags, next) };
  });
}
function setFlag(key, val){
  setState(function(st){
    var next = {}; next[key] = val;
    return { flags: Object.assign({}, st.flags, next) };
  });
}

function printJob(msg){
  setState({ toast: msg });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ setState({ toast: '' }); }, 2600);
}

/* shared inline styles reused across screens */
var tableBadge = 'display:inline-flex;align-items:center;font:600 11px var(--font-mono);color:var(--color-text-muted);'
               + 'background:var(--color-background-secondary);border-radius:7px;padding:6px 11px';
var pencilStyle = 'background:transparent;border:.5px solid var(--color-border-tertiary);border-radius:7px;cursor:pointer;'
                + 'color:var(--color-text-muted);width:28px;height:28px;display:flex;align-items:center;justify-content:center;flex:none';
var porteeBadge = pill('#eef3fb', '#2a5a9e');
var langBadge = pill('var(--color-background-secondary)', 'var(--color-text-muted)');

var PENCIL_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">'
               + '<path d="M4 20h3l11-11-3-3L4 17z"/><path d="M14 5l3 3"/></svg>';

/* ==========================================================================
   DATA — network-level (franchisor) records
   ========================================================================== */
var titles = {
  dash:'Tableau de bord réseau', boutiques:'Boutiques', audit:"Journal d'audit",
  catalogue:'Catalogue', promos:'Promotions réseau', config:'Config marque',
  comms:'Communications', users:'Utilisateurs & rôles'
};
var subs = {
  dash:"Consolidé multi-boutiques · L'Atelier By", boutiques:'Identité · branding · webshop',
  audit:'Traçabilité des actions sensibles', catalogue:'Produits · catégories · i18n',
  promos:'Bons & règles à portée réseau', config:'Paramètres généraux (liste blanche)',
  comms:"Modèles d'email transactionnels", users:'Comptes back-office & portée (RBAC)'
};

var KPIS = [
  { label:'CA réseau (mois)',     value:'428 k€',  valColor:'var(--color-text)',    delta:'▲ +6,4 %',      deltaColor:'#2d7a3e' },
  { label:'CA boutique',          value:'306 k€',  valColor:'var(--color-primary)', delta:'▲ +4,8 %',      deltaColor:'#2d7a3e' },
  { label:'CA livraison bureau',  value:'122 k€',  valColor:'#C87A3F',              delta:'▲ +11 %',       deltaColor:'#2d7a3e' },
  { label:'Boutiques actives',    value:'14 / 15', valColor:'var(--color-text)',    delta:'▲ +1 ce trim.', deltaColor:'#2d7a3e' },
  { label:'Commandes du jour',    value:'512',     valColor:'var(--color-text)',    delta:'▲ +38 vs hier', deltaColor:'#2d7a3e' },
  { label:'Adoption whitelist',   value:'82 %',    valColor:'var(--color-text)',    delta:'▼ −3 pts',      deltaColor:'var(--color-primary)' }
];

var SHOPS = [
  { id:'bxl', nom:"L'Atelier — Bruxelles-Centre", ville:'Bruxelles 1000', web:true,  contrat:'Succursale', act:true,  caShop:29800, caOffice:8400, adoption:96, accent:'var(--color-primary)' },
  { id:'and', nom:"L'Atelier — Anderlecht",       ville:'Anderlecht 1070',web:true,  contrat:'Franchise',  act:true,  caShop:18600, caOffice:6200, adoption:88, accent:APRICOT },
  { id:'ucc', nom:"L'Atelier — Uccle",            ville:'Uccle 1180',     web:true,  contrat:'Franchise',  act:true,  caShop:22100, caOffice:9400, adoption:79, accent:COPPER },
  { id:'sch', nom:"L'Atelier — Schaerbeek",       ville:'Schaerbeek 1030',web:false, contrat:'Franchise',  act:true,  caShop:0,     caOffice:0,    adoption:0,  accent:APRICOT },
  { id:'lv',  nom:"L'Atelier — Louvain",          ville:'Louvain 3000',   web:true,  contrat:'Master',     act:false, caShop:14200, caOffice:5200, adoption:71, accent:COPPER }
];

var CATALOG = [
  { cat:'Boulangerie', prods:[
    { nom:'Baguette tradition', prix:1.35, statut:'Publié', bw:true,  bm:true,  ad:96 },
    { nom:'Pain au chocolat',   prix:1.60, statut:'Publié', bw:true,  bm:false, ad:74 }
  ]},
  { cat:'Pâtisserie fraîche', prods:[
    { nom:'Éclair chocolat',    prix:3.50,  statut:'Publié',      bw:true, bm:true,  ad:88 },
    { nom:'Tarte aux fraises',  prix:4.20,  statut:'Saisonnier', saison:'Été',  bw:true, bm:false, ad:52 },
    { nom:'Bûche signature',    prix:24.00, statut:'Publié',     saison:'Noël', bw:true, bm:true,  ad:100 }
  ]},
  { cat:'Chocolaterie', prods:[
    { nom:'Macarons (boîte 24)', prix:19.90, statut:'Publié', bw:true, bm:false, ad:64 }
  ]},
  { cat:'Traiteur', prods:[
    { nom:'Quiche lorraine',    prix:5.80,  statut:'Brouillon', bw:false, bm:false, ad:22 },
    { nom:'Foie gras mi-cuit',  prix:28.00, statut:'Publié',    bw:true,  bm:false, ad:41 }
  ]},
  { cat:'Glaces', prods:[
    { nom:'Glace artisanale',   prix:6.50,  statut:'Publié', saison:'Été', bw:false, bm:false, ad:30 }
  ]}
];

var VOUCHERS = [
  { code:'MARQUE15',  valeur:'−15 % sur la pâtisserie', type:'Panier',     validite:'campagne été' },
  { code:'BIENVENUE', valeur:'Onboarding B2B',          type:'add_office', validite:'permanent' },
  { code:'RENTREE10', valeur:'−10 € dès 50 €',          type:'Montant',    validite:'sept.' }
];
var PRICING = [
  { nom:'Menu marque printemps',    cible:'Menus',                 effet:'19,90 €' },
  { nom:'Tarif réseau pâtisserie',  cible:'Pâtisserie fraîche',    effet:'prix fixe' },
  { nom:'Happy hour réseau',        cible:'Boulangerie 18–19h',    effet:'−20 %' }
];

var PARAMS = [
  { cle:'webshop.enabled',       type:'bool', def:true },
  { cle:'nav.icon_back',         type:'text', val:'arrow-left' },
  { cle:'delivery.enabled',      type:'bool', def:true },
  { cle:'order.cutoff_default',  type:'text', val:'17:00' },
  { cle:'brand.support_url',     type:'text', val:'https://aide.latelierby.be' }
];

var TEMPLATES = [
  { cle:'order_confirm',     langue:'FR', sujet:'Votre commande {{commande_ref}} est confirmée' },
  { cle:'order_ready',       langue:'FR', sujet:'Votre commande est prête' },
  { cle:'invoice',           langue:'FR', sujet:'Facture {{commande_ref}}' },
  { cle:'office_onboarding', langue:'FR', sujet:'Bienvenue — votre compte {{bureau}}' },
  { cle:'office_reject',     langue:'FR', sujet:'Votre demande de rattachement' }
];

var USERS = [
  { nom:'Sophie Renard',   email:'sophie.renard@latelierby.be', role:'Siège',     portee:'Réseau complet',    act:true },
  { nom:'Thomas Legrand',  email:'thomas.legrand@latelierby.be',role:'Franchise', portee:'Bruxelles-Centre',  act:true },
  { nom:'Marek Kowalski',  email:'m.kowalski@latelierby.be',    role:'Franchise', portee:'Anderlecht, Uccle', act:true },
  { nom:'Julie Peeters',   email:'j.peeters@latelierby.be',     role:'Franchise', portee:'Louvain',           act:false }
];

var AUDIT = [
  { ts:'17/07 14:22', user:'Sophie Renard',  verb:'Modification', entity:'ws_products #128 (brand_mandatory)', shop:'Réseau' },
  { ts:'17/07 13:05', user:'Thomas Legrand', verb:'Création',     entity:'ws_vouchers BXL10',                  shop:'Bruxelles-Centre' },
  { ts:'17/07 11:40', user:'Sophie Renard',  verb:'Modification', entity:'ws_param webshop.enabled',           shop:'Réseau' },
  { ts:'16/07 18:12', user:'Marek Kowalski', verb:'Suppression',  entity:'ws_office_delivery_sites #44',       shop:'Anderlecht' },
  { ts:'16/07 09:30', user:'Sophie Renard',  verb:'Création',     entity:'bo_users j.peeters',                 shop:'Louvain' }
];

/* nav layout: a "Pilotage" plain group + a collapsible "Paramétrage" group */
var NAV = [
  { label:'Pilotage', collapsible:false, items:[
    ['dash','Tableau de bord réseau', COPPER],
    ['boutiques','Boutiques', APRICOT],
    ['audit',"Journal d'audit", 'var(--color-text-muted)'],
    ['catalogue','Catalogue', 'var(--color-primary)'],
    ['promos','Promotions réseau', APRICOT]
  ]},
  { label:'Paramétrage', collapsible:true, items:[
    ['config','Config marque', 'var(--color-primary)'],
    ['comms','Communications', 'var(--color-primary)'],
    ['users','Utilisateurs & rôles', COPPER]
  ]}
];

/* ==========================================================================
   FORM DEFINITIONS — modal create/edit, one per entity
   ========================================================================== */
function sel(a){ return a.map(function(x){ return { value:x, label:x }; }); }

function formDefs(){
  var villes = ['Bruxelles','Anderlecht','Uccle','Schaerbeek','Louvain','Waterloo'];
  var cats   = ['Boulangerie','Pâtisserie fraîche','Chocolaterie','Traiteur','Glaces'];
  return {
    shop: { title:'Boutique', table:'shops (+ ws_shops)', save:'Enregistrer', fields:[
      { k:'nom',     label:'Enseigne', type:'text', ph:"L'Atelier — …" },
      { k:'ville',   label:'Ville',    type:'select', options:sel(villes), def:villes[0] },
      { k:'contrat', label:'Contrat',  type:'select', options:sel(['Franchise','Succursale','Master']), def:'Franchise' },
      { k:'accent',  label:'Accent (branding)', type:'select', options:sel(['Ruby Red','Abricot','Old Copper']), def:'Ruby Red' }
    ]},
    product: { title:'Produit', table:'ws_products', save:'Créer', fields:[
      { k:'nom',  label:'Nom',       type:'text', ph:'ex. Éclair chocolat' },
      { k:'cat',  label:'Catégorie', type:'select', options:sel(cats), def:cats[0] },
      { k:'prix', label:'Prix de référence (€)', type:'number', def:3.5 }
    ]},
    voucher: { title:'Bon', table:'ws_vouchers', save:'Créer le bon', fields:[
      { k:'code',       label:'Code',                          type:'text',   ph:'ex. BIENVENUE10' },
      { k:'type',       label:'Type (type)',                   type:'select', options:sel(['percent','amount','free_delivery','add_office']), def:'percent' },
      { k:'value',      label:'Valeur (value)',                type:'number', def:10 },
      { k:'min_order',  label:'Commande min. (min_order €)',   type:'number', def:20 },
      { k:'max_uses',   label:'Utilisations max (max_uses · vide = illimité)', type:'number', def:100 },
      { k:'expires_at', label:'Expiration (expires_at)',       type:'text',   def:'2027-01-01' },
      { k:'shops',      label:'Boutiques ciblées — vide = bon marque réseau ⇩ (shop_id NULL)', type:'checks', options:['Bruxelles-Centre','Anderlecht','Uccle','Schaerbeek','Louvain'] },
      { k:'active',     label:'Actif (active)',                type:'bool',   def:true }
    ]},
    pricing: { title:'Règle de prix réseau', table:'ws_pricing_rules (shop_id NULL)', save:'Créer', fields:[
      { k:'nom',   label:'Libellé', type:'text', ph:'ex. Menu marque printemps' },
      { k:'cible', label:'Cible',   type:'text', ph:'catégorie / produit' },
      { k:'effet', label:'Effet',   type:'text', ph:'ex. 19,90 € ou −10 %' }
    ]},
    user: { title:'Utilisateur', table:'bo_users (+ bo_user_shops)', save:'Enregistrer', fields:[
      { k:'nom',    label:'Nom',   type:'text', ph:'Prénom Nom' },
      { k:'email',  label:'Email', type:'text', ph:'prenom@latelier.be' },
      { k:'role',   label:'Rôle',  type:'select', options:sel(['Siège','Franchise']), def:'Franchise' },
      { k:'portee', label:'Portée (boutiques)', type:'text', ph:'ex. Bruxelles-Centre, Uccle' }
    ]},
    template: { title:"Modèle d'email", table:'ws_email_templates', save:'Enregistrer', fields:[
      { k:'cle',    label:'Clé',    type:'select', options:sel(['order_confirm','order_ready','invoice','office_onboarding','office_reject']), def:'order_confirm' },
      { k:'langue', label:'Langue', type:'select', options:sel(['FR','NL','EN','DE']), def:'FR' },
      { k:'sujet',  label:'Sujet',  type:'text', ph:'Votre commande {{commande_ref}}' },
      { k:'corps',  label:'Corps',  type:'area', ph:'Bonjour {{client_nom}}, …' }
    ]}
  };
}

function openForm(key){
  var c = formDefs()[key], v = {};
  c.fields.forEach(function(f){
    v[f.k] = f.type === 'checks' ? []
           : f.type === 'bool'   ? (f.def !== undefined ? f.def : false)
           : (f.def !== undefined ? f.def : '');
  });
  setState({ formKey:key, formVals:v, formEdit:false });
}
function editForm(key, vals){
  var c = formDefs()[key], v = {};
  c.fields.forEach(function(f){
    if (f.type === 'checks') {
      v[f.k] = (vals && Array.isArray(vals[f.k])) ? vals[f.k] : [];
    } else if (f.type === 'bool') {
      v[f.k] = (vals && vals[f.k] !== undefined) ? vals[f.k] : (f.def !== undefined ? f.def : false);
    } else {
      v[f.k] = (vals && vals[f.k] !== undefined && vals[f.k] !== '') ? vals[f.k] : (f.def !== undefined ? f.def : '');
    }
  });
  setState({ formKey:key, formVals:v, formEdit:true });
}
function closeForm(){ setState({ formKey:null }); }
function submitForm(){
  var c = formDefs()[state.formKey];
  if (!c) return;
  var ed = state.formEdit;
  setState({ formKey:null });
  printJob((ed ? '✔ Mis à jour dans ' : '✔ Enregistré dans ') + c.table);
}

/* ==========================================================================
   RENDER — pure functions returning HTML strings from current state
   ========================================================================== */
function navItemStyle(screen){
  var on = state.screen === screen;
  return 'display:flex;align-items:center;gap:11px;width:100%;padding:11px 12px;border:none;border-radius:9px;'
       + 'cursor:pointer;font:' + (on ? '600' : '500') + ' 13px/1 var(--font-ui);text-align:left;'
       + (on ? 'background:var(--color-primary);color:#fff' : 'background:transparent;color:var(--color-text)');
}

function renderSidebar(){
  var blocks = NAV.map(function(b){
    var open = b.collapsible ? state.paramNavOpen : true;
    var head;
    if (b.collapsible) {
      var chev = 'flex:none;transition:transform .15s' + (open ? ';transform:rotate(90deg)' : '');
      head = '<button data-act="navToggle" style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 12px;'
           + 'margin:14px 0 2px;border:none;border-radius:8px;cursor:pointer;text-align:left;background:transparent;color:var(--color-text-muted)">'
           + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="' + chev + '"><path d="M9 6l6 6-6 6"/></svg>'
           + '<span style="flex:1;font:600 10px/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase">' + esc(b.label) + '</span></button>';
    } else {
      head = '<div style="margin:14px 8px 6px;font:600 10px/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--color-text-muted)">' + esc(b.label) + '</div>';
    }
    var items = '';
    if (open) {
      items = b.items.map(function(it){
        var s = it[0], label = it[1], c = it[2];
        var dotC = state.screen === s ? '#fff' : c;
        return '<button data-act="go" data-screen="' + s + '" style="' + navItemStyle(s) + '">'
             + '<span style="' + dot(dotC) + '"></span>'
             + '<span style="flex:1;text-align:left">' + esc(label) + '</span></button>';
      }).join('');
    }
    return head + items;
  }).join('');

  return '<aside style="background:var(--color-surface);border-right:.5px solid var(--color-border-tertiary);display:flex;flex-direction:column;overflow:hidden">'
    + '<div style="padding:18px 20px 15px;border-bottom:.5px solid var(--color-border-tertiary)">'
    +   '<img src="img/logo.png" alt="L\'Atelier" style="height:30px;width:auto;display:block"/>'
    +   '<div style="display:flex;align-items:center;gap:7px;margin-top:9px">'
    +     '<span style="width:7px;height:7px;border-radius:50%;background:var(--color-primary)"></span>'
    +     '<span style="font:600 10px/1 var(--font-ui);letter-spacing:.09em;text-transform:uppercase;color:var(--color-primary)">Console marque · Siège</span>'
    +   '</div>'
    + '</div>'
    + '<nav class="lz" style="flex:1;overflow-y:auto;padding:10px 12px 20px;display:flex;flex-direction:column;gap:3px">'
    +   '<a href="#" style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:4px;border-radius:8px;background:var(--color-background-secondary);color:var(--color-text-muted);font:500 12px/1 var(--font-ui)">'
    +     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 19l-7-7 7-7"/><path d="M3 12h18"/></svg><span>Retour à l\'ERP</span></a>'
    +   blocks
    + '</nav>'
    + '<div style="padding:12px 16px;border-top:.5px solid var(--color-border-tertiary);display:flex;align-items:center;gap:10px">'
    +   '<div style="width:30px;height:30px;border-radius:50%;background:var(--color-primary);color:#fff;display:flex;align-items:center;justify-content:center;font:600 12px var(--font-ui)">SR</div>'
    +   '<div style="line-height:1.2"><div style="font:500 12px var(--font-ui);color:var(--color-text)">Sophie Renard</div>'
    +   '<div style="font:400 10px var(--font-ui);color:var(--color-text-muted)">Admin réseau · Siège</div></div>'
    + '</div>'
    + '</aside>';
}

function renderHeader(){
  return '<header style="height:58px;flex:none;background:var(--color-surface);border-bottom:.5px solid var(--color-border-tertiary);display:flex;align-items:center;justify-content:space-between;padding:0 22px;gap:16px">'
    + '<div style="display:flex;align-items:baseline;gap:12px;min-width:0;flex:1">'
    +   '<h1 class="t-page-title" style="font-size:21px;margin:0;white-space:nowrap">' + esc(titles[state.screen]) + '</h1>'
    +   '<span style="font:400 12px var(--font-ui);color:var(--color-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(subs[state.screen]) + '</span>'
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:12px;flex:none">'
    +   '<span style="font:400 12px var(--font-ui);color:var(--color-text-muted);white-space:nowrap">jeu. 17 juil. 2026</span>'
    + '</div>'
    + '</header>';
}

function renderDash(){
  var kpiCards = KPIS.map(function(k){
    return '<div style="background:var(--color-surface);border:.5px solid var(--color-border-tertiary);border-radius:12px;padding:16px">'
      + '<div class="t-admin-label">' + esc(k.label) + '</div>'
      + '<div style="font:700 26px/1 var(--font-ui);color:' + k.valColor + ';margin:9px 0 4px">' + esc(k.value) + '</div>'
      + '<div style="font:400 11px var(--font-ui);color:' + k.deltaColor + '">' + esc(k.delta) + '</div></div>';
  }).join('');

  var grid = '1.7fr .9fr .8fr .9fr .9fr .8fr';
  var head = '<div style="display:grid;grid-template-columns:' + grid + ';padding:8px 6px;border-bottom:.5px solid var(--color-border-tertiary)">'
    + '<span class="t-admin-label">Boutique</span><span class="t-admin-label">Ville</span>'
    + '<span class="t-admin-label" style="text-align:center">Webshop</span>'
    + '<span class="t-admin-label" style="text-align:right">CA boutique</span>'
    + '<span class="t-admin-label" style="text-align:right">CA bureau</span>'
    + '<span class="t-admin-label" style="text-align:right">Adoption</span></div>';

  var rows = SHOPS.map(function(s){
    var w = tog('shopWeb_' + s.id, s.web);
    var adColor = s.adoption >= 85 ? '#2d7a3e' : (s.adoption >= 70 ? '#b26a00' : 'var(--color-primary)');
    var webPill = pill(w.on ? '#eaf5ec' : 'var(--color-background-secondary)', w.on ? '#2d7a3e' : 'var(--color-text-muted)');
    return '<div style="display:grid;grid-template-columns:' + grid + ';align-items:center;padding:11px 6px;border-bottom:.5px solid var(--color-border-tertiary)">'
      + '<span style="font:500 12.5px var(--font-ui);color:var(--color-text)">' + esc(s.nom) + '</span>'
      + '<span style="font:400 12px var(--font-ui);color:var(--color-text-muted)">' + esc(s.ville) + '</span>'
      + '<div style="display:flex;justify-content:center"><span style="' + webPill + '">' + (w.on ? 'En ligne' : 'Coupé') + '</span></div>'
      + '<span style="font:600 12px var(--font-ui);color:var(--color-primary);text-align:right">' + (s.caShop ? eur(s.caShop) : '—') + '</span>'
      + '<span style="font:600 12px var(--font-ui);color:#C87A3F;text-align:right">' + (s.caOffice ? eur(s.caOffice) : '—') + '</span>'
      + '<span style="font:600 12px var(--font-ui);color:' + adColor + ';text-align:right">' + s.adoption + ' %</span></div>';
  }).join('');

  return '<div style="display:flex;flex-direction:column;gap:18px">'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">' + kpiCards + '</div>'
    + '<div style="background:var(--color-surface);border:.5px solid var(--color-border-tertiary);border-radius:12px;padding:20px">'
    +   '<div class="t-section-title" style="font-size:15px;margin-bottom:3px">Boutiques du réseau</div>'
    +   '<div style="font:400 11px var(--font-ui);color:var(--color-text-muted);margin-bottom:14px">Vue consolidée · CA du mois · adoption de la whitelist marque</div>'
    +   head + rows
    + '</div></div>';
}

function renderBoutiques(){
  var grid = '1.6fr 1fr .8fr .9fr .7fr 40px';
  var head = '<div style="display:grid;grid-template-columns:' + grid + ';padding:8px 6px;border-bottom:.5px solid var(--color-border-tertiary)">'
    + '<span class="t-admin-label">Boutique</span><span class="t-admin-label">Ville</span>'
    + '<span class="t-admin-label" style="text-align:center">Webshop</span><span class="t-admin-label">Contrat</span>'
    + '<span class="t-admin-label" style="text-align:center">Actif</span><span></span></div>';
  var rows = SHOPS.map(function(s){
    var w = tog('shopWeb_' + s.id, s.web), a = tog('shopAct_' + s.id, s.act);
    return '<div style="display:grid;grid-template-columns:' + grid + ';align-items:center;padding:11px 6px;border-bottom:.5px solid var(--color-border-tertiary)">'
      + '<div style="display:flex;align-items:center;gap:9px"><span style="width:10px;height:10px;border-radius:3px;background:' + s.accent + ';flex:none"></span>'
      +   '<span style="font:500 12.5px var(--font-ui);color:var(--color-text)">' + esc(s.nom) + '</span></div>'
      + '<span style="font:400 12px var(--font-ui);color:var(--color-text-muted)">' + esc(s.ville) + '</span>'
      + '<div style="display:flex;justify-content:center"><button data-act="flip" data-key="shopWeb_' + s.id + '" data-def="' + (s.web?1:0) + '" style="' + w.style + '"><span style="' + w.knob + '"></span></button></div>'
      + '<span style="font:400 12px var(--font-ui);color:var(--color-text-muted)">' + esc(s.contrat) + '</span>'
      + '<div style="display:flex;justify-content:center"><button data-act="flip" data-key="shopAct_' + s.id + '" data-def="' + (s.act?1:0) + '" style="' + a.style + '"><span style="' + a.knob + '"></span></button></div>'
      + '<div style="display:flex;justify-content:flex-end"><button data-act="editShop" data-id="' + s.id + '" style="' + pencilStyle + '">' + PENCIL_SVG + '</button></div></div>';
  }).join('');
  return '<div style="display:flex;flex-direction:column;gap:16px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><span style="' + tableBadge + '">ws_shops ← franchise_shops · synchronisé</span></div>'
    + '<div style="background:var(--color-surface);border:.5px solid var(--color-border-tertiary);border-radius:12px;padding:20px">' + head + rows + '</div>'
    + '</div>';
}

function renderCatalogue(){
  var grid = '2.2fr .9fr .9fr .9fr 1.1fr 40px';
  var head = '<div style="display:grid;grid-template-columns:' + grid + ';padding:8px 6px;border-bottom:.5px solid var(--color-border-tertiary)">'
    + '<span class="t-admin-label">Catégorie / produit</span><span class="t-admin-label" style="text-align:right">Prix réf.</span>'
    + '<span class="t-admin-label" style="text-align:center">Webshop</span><span class="t-admin-label" style="text-align:center">Oblig.</span>'
    + '<span class="t-admin-label">Adoption</span><span></span></div>';
  var stPill = function(s){
    return pill(s === 'Publié' ? '#eaf5ec' : (s === 'Brouillon' ? 'var(--color-background-secondary)' : '#fbf1e3'),
                s === 'Publié' ? '#2d7a3e' : (s === 'Brouillon' ? 'var(--color-text-muted)' : '#b26a00'));
  };
  var body = '';
  CATALOG.forEach(function(c, ci){
    var ok = 'catO_' + ci;
    var open = state.flags[ok] !== undefined ? state.flags[ok] : true;
    var nbWeb = c.prods.filter(function(p, pi){ var v = state.flags['bw_' + ci + '_' + pi]; return v !== undefined ? v : p.bw; }).length;
    body += '<div data-act="flip" data-key="' + ok + '" data-def="1" style="display:flex;align-items:center;gap:10px;padding:11px 8px;background:var(--color-background-secondary);border-radius:8px;margin-top:8px;cursor:pointer">'
      + '<span style="width:14px;color:var(--color-text-muted);flex:none;font-size:11px">' + (open ? '▾' : '▸') + '</span>'
      + '<span style="font:600 12px var(--font-ui);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text);flex:1">' + esc(c.cat) + '</span>'
      + '<span style="font:400 11px var(--font-ui);color:var(--color-text-muted)">' + c.prods.length + ' produits · ' + nbWeb + ' en ligne</span></div>';
    if (!open) return;
    c.prods.forEach(function(p, pi){
      var bw = tog('bw_' + ci + '_' + pi, p.bw), bm = tog('bm_' + ci + '_' + pi, p.bm);
      var pk = 'prix_' + ci + '_' + pi;
      var pv = state.flags[pk] !== undefined ? state.flags[pk] : p.prix;
      var adColor = p.ad >= 80 ? '#2d7a3e' : (p.ad >= 50 ? '#b26a00' : 'var(--color-primary)');
      var saison = p.saison ? '<span style="' + pill('#fbf1e3','#C87A3F') + '">◷ ' + esc(p.saison) + '</span>' : '';
      body += '<div style="display:grid;grid-template-columns:' + grid + ';align-items:center;padding:10px 6px 10px 22px;border-bottom:.5px solid var(--color-border-tertiary)">'
        + '<div style="display:flex;align-items:center;gap:8px;min-width:0"><span style="font:500 12.5px var(--font-ui);color:var(--color-text)">' + esc(p.nom) + '</span>'
        +   '<span style="' + stPill(p.statut) + '">' + esc(p.statut) + '</span>' + saison + '</div>'
        + '<div style="display:flex;justify-content:flex-end"><input type="number" step="0.01" value="' + esc(pv) + '" data-inp="setFlag" data-key="' + pk + '" '
        +   'style="width:70px;text-align:right;border:.5px solid var(--color-border-secondary);border-radius:7px;padding:6px 7px;font:600 12px var(--font-ui);color:var(--color-text);background:var(--color-surface)"/></div>'
        + '<div style="display:flex;justify-content:center"><button data-act="flip" data-key="bw_' + ci + '_' + pi + '" data-def="' + (p.bw?1:0) + '" style="' + bw.style + '"><span style="' + bw.knob + '"></span></button></div>'
        + '<div style="display:flex;justify-content:center"><button data-act="flip" data-key="bm_' + ci + '_' + pi + '" data-def="' + (p.bm?1:0) + '" style="' + bm.style + '"><span style="' + bm.knob + '"></span></button></div>'
        + '<div style="display:flex;align-items:center;gap:7px"><div style="flex:1;height:7px;background:var(--color-background-secondary);border-radius:5px;overflow:hidden"><div style="width:' + p.ad + '%;height:100%;background:' + adColor + ';border-radius:5px"></div></div>'
        +   '<span style="font:600 10px var(--font-ui);color:var(--color-text-muted);width:30px;text-align:right">' + p.ad + ' %</span></div>'
        + '<div style="display:flex;justify-content:flex-end"><button data-act="editProduct" data-ci="' + ci + '" data-pi="' + pi + '" style="' + pencilStyle + '">' + PENCIL_SVG + '</button></div></div>';
    });
  });
  return '<div style="display:flex;flex-direction:column;gap:16px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><span style="' + tableBadge + '">ws_products · product_categories · ws_season ← ERP (lecture)</span>'
    +   '<span style="font:400 11px var(--font-ui);color:var(--color-text-muted)">Prix réf. &amp; gouvernance éditables · catalogue synchronisé ERP</span></div>'
    + '<div style="background:var(--color-surface);border:.5px solid var(--color-border-tertiary);border-radius:12px;padding:20px">'
    +   '<div style="font:400 11px/1.5 var(--font-ui);color:var(--color-text-muted);margin-bottom:12px"><strong>Prix réf.</strong> conseillé réseau · <strong>Webshop marque</strong> = whitelist ⇩ · <strong>Obligatoire</strong> verrouille l\'assortiment franchisé · adoption = % boutiques</div>'
    +   head + body
    + '</div></div>';
}

function renderPromos(){
  var cards = VOUCHERS.map(function(v){
    return '<div style="border:.5px solid var(--color-border-tertiary);border-radius:12px;padding:14px 16px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
      +   '<span style="font:700 14px var(--font-mono);color:var(--color-primary);letter-spacing:.05em">' + esc(v.code) + '</span>'
      +   '<span style="' + porteeBadge + '">Réseau</span></div>'
      + '<div style="font:500 13px var(--font-ui);color:var(--color-text)">' + esc(v.valeur) + '</div>'
      + '<div style="font:400 11px var(--font-ui);color:var(--color-text-muted);margin-top:2px">' + esc(v.type) + ' · ' + esc(v.validite) + '</div></div>';
  }).join('');
  var pHead = '<div style="display:grid;grid-template-columns:1.8fr 1.1fr .9fr;padding:8px 6px;border-bottom:.5px solid var(--color-border-tertiary)">'
    + '<span class="t-admin-label">Règle</span><span class="t-admin-label">Cible</span><span class="t-admin-label" style="text-align:right">Effet</span></div>';
  var pRows = PRICING.map(function(r){
    return '<div style="display:grid;grid-template-columns:1.8fr 1.1fr .9fr;align-items:center;padding:11px 6px;border-bottom:.5px solid var(--color-border-tertiary)">'
      + '<span style="font:500 12.5px var(--font-ui);color:var(--color-text)">' + esc(r.nom) + '</span>'
      + '<span style="font:400 12px var(--font-ui);color:var(--color-text-muted)">' + esc(r.cible) + '</span>'
      + '<span style="font:600 12px var(--font-ui);color:var(--color-text);text-align:right">' + esc(r.effet) + '</span></div>';
  }).join('');
  return '<div style="display:flex;flex-direction:column;gap:16px">'
    + '<div style="background:var(--color-surface);border:.5px solid var(--color-border-tertiary);border-radius:12px;padding:20px">'
    +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div>'
    +     '<div class="t-section-title" style="font-size:15px">Bons marque</div>'
    +     '<div style="font:400 11px var(--font-ui);color:var(--color-text-muted)">ws_vouchers · shop_id NULL = tout le réseau ⇩</div></div>'
    +     '<button data-act="openForm" data-key="voucher" class="btn-primary" style="font-size:12px;flex:none">+ Bon marque</button></div>'
    +   '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">' + cards + '</div>'
    + '</div>'
    + '<div style="background:var(--color-surface);border:.5px solid var(--color-border-tertiary);border-radius:12px;padding:20px">'
    +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div>'
    +     '<div class="t-section-title" style="font-size:15px">Règles de prix réseau</div>'
    +     '<div style="font:400 11px var(--font-ui);color:var(--color-text-muted)">ws_pricing_rules · shop_id NULL</div></div>'
    +     '<button data-act="openForm" data-key="pricing" class="btn-secondary" style="font-size:12px;flex:none">+ Règle</button></div>'
    +   pHead + pRows
    + '</div></div>';
}

function renderConfig(){
  var head = '<div style="display:grid;grid-template-columns:1.4fr 1.6fr .9fr;padding:8px 6px;border-bottom:.5px solid var(--color-border-tertiary)">'
    + '<span class="t-admin-label">Clé</span><span class="t-admin-label">Valeur</span><span class="t-admin-label" style="text-align:center">Type</span></div>';
  var rows = PARAMS.map(function(p, i){
    var val;
    if (p.type === 'bool') {
      var t = tog('param_' + i, p.def);
      val = '<div style="display:flex"><button data-act="flip" data-key="param_' + i + '" data-def="' + (p.def?1:0) + '" style="' + t.style + '"><span style="' + t.knob + '"></span></button></div>';
    } else {
      var k = 'paramv_' + i;
      var v = state.flags[k] !== undefined ? state.flags[k] : p.val;
      val = '<input type="text" value="' + esc(v) + '" data-inp="setFlag" data-key="' + k + '" '
          + 'style="width:100%;border:.5px solid var(--color-border-secondary);border-radius:7px;padding:7px 9px;font:500 12px var(--font-ui);color:var(--color-text);background:var(--color-surface)"/>';
    }
    return '<div style="display:grid;grid-template-columns:1.4fr 1.6fr .9fr;align-items:center;padding:10px 6px;border-bottom:.5px solid var(--color-border-tertiary)">'
      + '<span style="font:600 11.5px var(--font-mono);color:var(--color-text)">' + esc(p.cle) + '</span>'
      + val
      + '<span style="font:400 11px var(--font-ui);color:var(--color-text-muted);text-align:center">' + (p.type === 'bool' ? 'bool' : 'text') + '</span></div>';
  }).join('');
  return '<div style="display:flex;flex-direction:column;gap:16px">'
    + '<div style="background:var(--color-surface);border:.5px solid var(--color-border-tertiary);border-radius:12px;padding:20px">'
    +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px"><div class="t-section-title" style="font-size:15px">Config marque</div>'
    +     '<span style="' + tableBadge + '">ws_param (liste blanche)</span></div>'
    +   '<div style="font:400 11px var(--font-ui);color:var(--color-text-muted);margin-bottom:14px">Seuls les paramètres autorisés sont éditables · flags, icônes nav, URLs, deadlines</div>'
    +   head + rows
    + '</div></div>';
}

function renderComms(){
  var head = '<div style="display:grid;grid-template-columns:1.4fr 2fr .7fr 40px;padding:8px 6px;border-bottom:.5px solid var(--color-border-tertiary)">'
    + '<span class="t-admin-label">Modèle</span><span class="t-admin-label">Sujet</span>'
    + '<span class="t-admin-label" style="text-align:center">Langue</span><span></span></div>';
  var rows = TEMPLATES.map(function(t, i){
    return '<div style="display:grid;grid-template-columns:1.4fr 2fr .7fr 40px;align-items:center;padding:11px 6px;border-bottom:.5px solid var(--color-border-tertiary)">'
      + '<span style="font:600 11.5px var(--font-mono);color:var(--color-text)">' + esc(t.cle) + '</span>'
      + '<span style="font:400 12px var(--font-ui);color:var(--color-text-muted)">' + esc(t.sujet) + '</span>'
      + '<div style="display:flex;justify-content:center"><span style="' + langBadge + '">' + esc(t.langue) + '</span></div>'
      + '<div style="display:flex;justify-content:flex-end"><button data-act="editTemplate" data-i="' + i + '" style="' + pencilStyle + '">' + PENCIL_SVG + '</button></div></div>';
  }).join('');
  return '<div style="display:flex;flex-direction:column;gap:16px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><span style="' + tableBadge + '">ws_email_templates (clé × langue × marque)</span>'
    +   '<button data-act="openForm" data-key="template" class="btn-primary" style="font-size:12px;flex:none">+ Modèle</button></div>'
    + '<div style="background:var(--color-surface);border:.5px solid var(--color-border-tertiary);border-radius:12px;padding:20px">' + head + rows
    +   '<div style="margin-top:12px;background:var(--color-background-secondary);border-radius:9px;padding:11px 13px;font:400 11px/1.6 var(--font-ui);color:var(--color-text-muted)">'
    +     'Variables disponibles : <span style="font-family:var(--font-mono);color:var(--color-text)">{{client_nom}} · {{commande_ref}} · {{montant}} · {{date_livraison}} · {{bureau}}</span></div>'
    + '</div></div>';
}

function renderUsers(){
  var grid = '1.4fr 1.6fr .9fr 1.3fr .7fr 40px';
  var head = '<div style="display:grid;grid-template-columns:' + grid + ';padding:8px 6px;border-bottom:.5px solid var(--color-border-tertiary)">'
    + '<span class="t-admin-label">Nom</span><span class="t-admin-label">Email</span><span class="t-admin-label">Rôle</span>'
    + '<span class="t-admin-label">Portée</span><span class="t-admin-label" style="text-align:center">Actif</span><span></span></div>';
  var rows = USERS.map(function(u, i){
    var a = tog('userAct_' + i, u.act);
    var rolePill = pill(u.role === 'Siège' ? '#fbe9eb' : 'var(--color-background-secondary)', u.role === 'Siège' ? 'var(--color-primary)' : 'var(--color-text-muted)');
    return '<div style="display:grid;grid-template-columns:' + grid + ';align-items:center;padding:11px 6px;border-bottom:.5px solid var(--color-border-tertiary)">'
      + '<span style="font:500 12.5px var(--font-ui);color:var(--color-text)">' + esc(u.nom) + '</span>'
      + '<span style="font:400 11.5px var(--font-ui);color:var(--color-text-muted)">' + esc(u.email) + '</span>'
      + '<span style="' + rolePill + '">' + esc(u.role) + '</span>'
      + '<span style="font:400 11.5px var(--font-ui);color:var(--color-text-muted)">' + esc(u.portee) + '</span>'
      + '<div style="display:flex;justify-content:center"><button data-act="flip" data-key="userAct_' + i + '" data-def="' + (u.act?1:0) + '" style="' + a.style + '"><span style="' + a.knob + '"></span></button></div>'
      + '<div style="display:flex;justify-content:flex-end"><button data-act="editUser" data-i="' + i + '" style="' + pencilStyle + '">' + PENCIL_SVG + '</button></div></div>';
  }).join('');
  return '<div style="display:flex;flex-direction:column;gap:16px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><span style="' + tableBadge + '">bo_users · bo_user_shops (RBAC)</span>'
    +   '<button data-act="openForm" data-key="user" class="btn-primary" style="font-size:12px;flex:none">+ Utilisateur</button></div>'
    + '<div style="background:var(--color-surface);border:.5px solid var(--color-border-tertiary);border-radius:12px;padding:20px">' + head + rows + '</div>'
    + '</div>';
}

function renderAudit(){
  var vPill = function(v){
    return pill(v === 'Création' ? '#eaf5ec' : (v === 'Suppression' ? '#fbe9eb' : '#fbf1e3'),
                v === 'Création' ? '#2d7a3e' : (v === 'Suppression' ? 'var(--color-primary)' : '#b26a00'));
  };
  var head = '<div style="display:grid;grid-template-columns:1fr 1.3fr 1.6fr 1.1fr;padding:8px 6px;border-bottom:.5px solid var(--color-border-tertiary)">'
    + '<span class="t-admin-label">Horodatage</span><span class="t-admin-label">Acteur</span>'
    + '<span class="t-admin-label">Action</span><span class="t-admin-label">Boutique</span></div>';
  var rows = AUDIT.map(function(a){
    return '<div style="display:grid;grid-template-columns:1fr 1.3fr 1.6fr 1.1fr;align-items:center;padding:10px 6px;border-bottom:.5px solid var(--color-border-tertiary)">'
      + '<span style="font:400 11px var(--font-mono);color:var(--color-text-muted)">' + esc(a.ts) + '</span>'
      + '<span style="font:500 12px var(--font-ui);color:var(--color-text)">' + esc(a.user) + '</span>'
      + '<div style="display:flex;align-items:center;gap:7px"><span style="' + vPill(a.verb) + '">' + esc(a.verb) + '</span>'
      +   '<span style="font:400 11.5px var(--font-ui);color:var(--color-text-muted)">' + esc(a.entity) + '</span></div>'
      + '<span style="font:400 11.5px var(--font-ui);color:var(--color-text-muted)">' + esc(a.shop) + '</span></div>';
  }).join('');
  return '<div style="display:flex;flex-direction:column;gap:16px">'
    + '<div style="background:var(--color-surface);border:.5px solid var(--color-border-tertiary);border-radius:12px;padding:20px">'
    +   '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px"><div class="t-section-title" style="font-size:15px">Journal d\'audit</div>'
    +     '<span style="' + tableBadge + '">bo_audit</span></div>'
    +   '<div style="font:400 11px var(--font-ui);color:var(--color-text-muted);margin-bottom:14px">Toute écriture sensible est tracée · horodatage, acteur, action, entité, boutique</div>'
    +   head + rows
    + '</div></div>';
}

function renderModal(){
  var c = state.formKey ? formDefs()[state.formKey] : null;
  if (!c) return '';
  var inputBase = 'width:100%;padding:11px 12px;border:.5px solid var(--color-border-secondary);border-radius:9px;'
    + 'font:400 13px var(--font-ui);color:var(--color-text);background:var(--color-surface);box-sizing:border-box';
  var areaStyle = inputBase + ';min-height:96px;resize:vertical;font-family:var(--font-ui)';

  var fields = c.fields.map(function(f){
    var val = state.formVals[f.k] !== undefined ? state.formVals[f.k] : '';
    var inner;
    if (f.type === 'select') {
      var opts = f.options.map(function(o){
        return '<option value="' + esc(o.value) + '"' + (String(val) === String(o.value) ? ' selected' : '') + '>' + esc(o.label) + '</option>';
      }).join('');
      inner = '<select data-inp="formField" data-k="' + f.k + '" style="' + inputBase + '">' + opts + '</select>';
    } else if (f.type === 'number') {
      inner = '<input type="number" value="' + esc(val) + '" data-inp="formField" data-k="' + f.k + '" style="' + inputBase + '"/>';
    } else if (f.type === 'area') {
      inner = '<textarea data-inp="formField" data-k="' + f.k + '" placeholder="' + esc(f.ph || '') + '" style="' + areaStyle + '">' + esc(val) + '</textarea>';
    } else if (f.type === 'checks') {
      var arr = Array.isArray(val) ? val : [];
      inner = '<div style="display:flex;flex-wrap:wrap;gap:7px">' + f.options.map(function(o){
        var on = arr.indexOf(o) !== -1;
        var st = 'border:none;cursor:pointer;border-radius:20px;padding:7px 13px;font:600 11.5px var(--font-ui);'
          + (on ? 'background:var(--color-primary);color:#fff' : 'background:var(--color-background-secondary);color:var(--color-text-muted)');
        return '<button data-act="formCheck" data-k="' + f.k + '" data-opt="' + esc(o) + '" style="' + st + '">' + esc(o) + '</button>';
      }).join('') + '</div>';
    } else if (f.type === 'bool') {
      var on = !!val;
      var bStyle = 'position:relative;width:44px;height:24px;border-radius:20px;border:none;cursor:pointer;background:' + (on ? 'var(--color-primary)' : 'var(--color-border-secondary)');
      var bKnob = 'position:absolute;top:2px;left:' + (on ? '22px' : '2px') + ';width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2)';
      inner = '<button data-act="formBool" data-k="' + f.k + '" style="' + bStyle + '"><span style="' + bKnob + '"></span></button>';
    } else {
      inner = '<input type="text" value="' + esc(val) + '" placeholder="' + esc(f.ph || '') + '" data-inp="formField" data-k="' + f.k + '" style="' + inputBase + '"/>';
    }
    return '<div><label style="display:block;font:600 11px var(--font-ui);letter-spacing:.04em;text-transform:uppercase;color:var(--color-text-muted);margin-bottom:6px">' + esc(f.label) + '</label>' + inner + '</div>';
  }).join('');

  return '<div data-act="formClose" style="position:fixed;inset:0;background:rgba(34,34,34,.42);display:flex;align-items:center;justify-content:center;z-index:2100;padding:24px">'
    + '<div data-stop="1" style="background:var(--color-surface);border-radius:14px;width:490px;max-width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)">'
    +   '<div style="padding:20px 24px 16px;border-bottom:.5px solid var(--color-border-tertiary);display:flex;justify-content:space-between;align-items:start">'
    +     '<div style="min-width:0"><div class="t-page-title" style="font-size:18px">' + esc(c.title) + '</div>'
    +       '<div style="display:inline-flex;align-items:center;gap:6px;margin-top:6px;background:var(--color-background-secondary);border-radius:6px;padding:4px 9px">'
    +         '<span style="font:600 11px var(--font-mono);color:var(--color-text-muted)">' + esc(c.table) + '</span></div></div>'
    +     '<button data-act="formClose" style="background:transparent;border:none;cursor:pointer;color:var(--color-text-muted);font-size:22px;line-height:1;padding:0">×</button></div>'
    +   '<div style="padding:18px 24px;display:flex;flex-direction:column;gap:14px">' + fields + '</div>'
    +   '<div style="padding:14px 24px 20px;border-top:.5px solid var(--color-border-tertiary);display:flex;gap:10px">'
    +     '<button data-act="formClose" class="btn-secondary" style="flex:1;font-size:13px">Annuler</button>'
    +     '<button data-act="formSubmit" class="btn-primary" style="flex:2;font-size:13px">' + esc(c.save) + '</button></div>'
    + '</div></div>';
}

function renderToast(){
  if (!state.toast) return '';
  return '<div style="position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2500;background:var(--color-text);color:#fff;'
    + 'border-radius:10px;padding:14px 22px;font:500 13px var(--font-ui);box-shadow:0 8px 30px rgba(0,0,0,.3)">' + esc(state.toast) + '</div>';
}

var SCREENS = {
  dash:renderDash, boutiques:renderBoutiques, catalogue:renderCatalogue,
  promos:renderPromos, config:renderConfig, comms:renderComms, users:renderUsers, audit:renderAudit
};

function render(){
  var main = (SCREENS[state.screen] || renderDash)();
  document.getElementById('app').innerHTML =
    '<div style="display:grid;grid-template-columns:250px 1fr;height:100vh;background:var(--color-bg);overflow:hidden">'
    + renderSidebar()
    + '<div style="display:flex;flex-direction:column;overflow:hidden">'
    +   renderHeader()
    +   '<main class="lz" style="flex:1;overflow-y:auto;padding:24px 26px 60px">' + main + '</main>'
    + '</div>'
    + renderToast()
    + renderModal()
    + '</div>';
}

/* ==========================================================================
   EVENT DELEGATION — one click + one input listener for the whole app
   ========================================================================== */
function findAct(el){
  while (el && el !== document.body) {
    if (el.getAttribute) {
      if (el.getAttribute('data-act')) return el;
      // A click that lands in the dialog's dead space must NOT reach the
      // backdrop's close action — stop the walk at the dialog boundary.
      if (el.getAttribute('data-stop')) return null;
    }
    el = el.parentNode;
  }
  return null;
}

document.addEventListener('click', function(e){
  var el = findAct(e.target);
  if (!el) return;
  var act = el.getAttribute('data-act');
  switch (act) {
    case 'go':        setState({ screen: el.getAttribute('data-screen') }); break;
    case 'navToggle': setState(function(st){ return { paramNavOpen: !st.paramNavOpen }; }); break;
    case 'flip':      flipFlag(el.getAttribute('data-key'), el.getAttribute('data-def') === '1'); break;
    case 'openForm':  openForm(el.getAttribute('data-key')); break;
    case 'editShop': {
      var s = SHOPS.filter(function(x){ return x.id === el.getAttribute('data-id'); })[0];
      if (s) editForm('shop', { nom:s.nom, ville:s.ville.replace(/\s\d+$/, ''), contrat:s.contrat });
      break;
    }
    case 'editProduct': {
      var c = CATALOG[+el.getAttribute('data-ci')]; var p = c && c.prods[+el.getAttribute('data-pi')];
      if (p) editForm('product', { nom:p.nom, cat:c.cat, prix:p.prix });
      break;
    }
    case 'editUser': {
      var u = USERS[+el.getAttribute('data-i')];
      if (u) editForm('user', { nom:u.nom, email:u.email, role:u.role, portee:u.portee });
      break;
    }
    case 'editTemplate': {
      var t = TEMPLATES[+el.getAttribute('data-i')];
      if (t) editForm('template', { cle:t.cle, langue:t.langue, sujet:t.sujet });
      break;
    }
    case 'formClose': closeForm(); break;
    case 'formSubmit': submitForm(); break;
    case 'formBool':   flipFormBool(el.getAttribute('data-k')); break;
    case 'formCheck':  toggleFormCheck(el.getAttribute('data-k'), el.getAttribute('data-opt')); break;
  }
});

document.addEventListener('input', function(e){
  var el = e.target;
  var inp = el.getAttribute && el.getAttribute('data-inp');
  if (!inp) return;
  if (inp === 'setFlag') {
    // inline edits: update flag without a full teardown of the focused field
    var key = el.getAttribute('data-key');
    state.flags = Object.assign({}, state.flags); state.flags[key] = el.value;
  } else if (inp === 'formField') {
    var k = el.getAttribute('data-k');
    state.formVals = Object.assign({}, state.formVals); state.formVals[k] = el.value;
  }
});

function flipFormBool(k){
  setState(function(st){
    var fv = Object.assign({}, st.formVals); fv[k] = !fv[k];
    return { formVals: fv };
  });
}
function toggleFormCheck(k, opt){
  setState(function(st){
    var cur = Array.isArray(st.formVals[k]) ? st.formVals[k].slice() : [];
    var i = cur.indexOf(opt);
    if (i === -1) cur.push(opt); else cur.splice(i, 1);
    var fv = Object.assign({}, st.formVals); fv[k] = cur;
    return { formVals: fv };
  });
}

/* ----- boot -------------------------------------------------------------- */
render();
