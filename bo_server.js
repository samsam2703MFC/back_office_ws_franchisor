// Server-simulation data layer for the back office.
// Every domain table lives here (seed), is persisted to localStorage (the DB),
// and is read by the pages via window.BOServer.table(name). No data is hardcoded in the UI.
(function(){
  var LS = 'ws_bo_store_v2';
  var SEED = {
    "kpis": [
      {label:'CA réseau (mois)',value:'428 k€',valColor:'var(--color-text)',delta:'▲ +6,4 %',deltaColor:'#2d7a3e'},
      {label:'CA boutique',value:'306 k€',valColor:'var(--color-primary)',delta:'▲ +4,8 %',deltaColor:'#2d7a3e'},
      {label:'CA livraison bureau',value:'122 k€',valColor:'#C87A3F',delta:'▲ +11 %',deltaColor:'#2d7a3e'},
      {label:'Boutiques actives',value:'14 / 15',valColor:'var(--color-text)',delta:'▲ +1 ce trim.',deltaColor:'#2d7a3e'},
      {label:'Commandes du jour',value:'512',valColor:'var(--color-text)',delta:'▲ +38 vs hier',deltaColor:'#2d7a3e'},
      {label:'Adoption whitelist',value:'82 %',valColor:'var(--color-text)',delta:'▼ −3 pts',deltaColor:'var(--color-primary)'},
    ],
    "shops": [
      {id:'bxl',nom:'L\'Atelier — Bruxelles-Centre',ville:'Bruxelles 1000',web:true,contrat:'Succursale',act:true,caShop:29800,caOffice:8400,adoption:96,accent:'var(--color-primary)'},
      {id:'and',nom:'L\'Atelier — Anderlecht',ville:'Anderlecht 1070',web:true,contrat:'Franchise',act:true,caShop:18600,caOffice:6200,adoption:88,accent:'#E8A15C'},
      {id:'ucc',nom:'L\'Atelier — Uccle',ville:'Uccle 1180',web:true,contrat:'Franchise',act:true,caShop:22100,caOffice:9400,adoption:79,accent:'#8C4A2F'},
      {id:'sch',nom:'L\'Atelier — Schaerbeek',ville:'Schaerbeek 1030',web:false,contrat:'Franchise',act:true,caShop:0,caOffice:0,adoption:0,accent:'#E8A15C'},
      {id:'lv',nom:'L\'Atelier — Louvain',ville:'Louvain 3000',web:true,contrat:'Master',act:false,caShop:14200,caOffice:5200,adoption:71,accent:'#8C4A2F'},
    ],
    "catalog": [
      {cat:'Boulangerie',prods:[
        {nom:'Baguette tradition',prix:1.35,statut:'Publié',bw:true,bm:true,ad:96},
        {nom:'Pain au chocolat',prix:1.60,statut:'Publié',bw:true,bm:false,ad:74},
      ]},
      {cat:'Pâtisserie fraîche',prods:[
        {nom:'Éclair chocolat',prix:3.50,statut:'Publié',bw:true,bm:true,ad:88},
        {nom:'Tarte aux fraises',prix:4.20,statut:'Saisonnier',saison:'Été',bw:true,bm:false,ad:52},
        {nom:'Bûche signature',prix:24.00,statut:'Publié',saison:'Noël',bw:true,bm:true,ad:100},
      ]},
      {cat:'Chocolaterie',prods:[
        {nom:'Macarons (boîte 24)',prix:19.90,statut:'Publié',bw:true,bm:false,ad:64},
      ]},
      {cat:'Traiteur',prods:[
        {nom:'Quiche lorraine',prix:5.80,statut:'Brouillon',bw:false,bm:false,ad:22},
        {nom:'Foie gras mi-cuit',prix:28.00,statut:'Publié',bw:true,bm:false,ad:41},
      ]},
      {cat:'Glaces',prods:[
        {nom:'Glace artisanale',prix:6.50,statut:'Publié',saison:'Été',bw:false,bm:false,ad:30},
      ]},
    ],
    "vouchers": [
      {code:'MARQUE15',valeur:'−15 % sur la pâtisserie',type:'Panier',validite:'campagne été'},
      {code:'BIENVENUE',valeur:'Onboarding B2B',type:'add_office',validite:'permanent'},
      {code:'RENTREE10',valeur:'−10 € dès 50 €',type:'Montant',validite:'sept.'},
    ],
    "pricing_rules": [
      {nom:'Menu marque printemps',cible:'Menus',effet:'19,90 €'},
      {nom:'Tarif réseau pâtisserie',cible:'Pâtisserie fraîche',effet:'prix fixe'},
      {nom:'Happy hour réseau',cible:'Boulangerie 18–19h',effet:'−20 %'},
    ],
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
    "users": [
      {nom:'Sophie Renard',email:'sophie.renard@latelierby.be',role:'Siège',portee:'Réseau complet',act:true},
      {nom:'Thomas Legrand',email:'thomas.legrand@latelierby.be',role:'Franchise',portee:'Bruxelles-Centre',act:true},
      {nom:'Marek Kowalski',email:'m.kowalski@latelierby.be',role:'Franchise',portee:'Anderlecht, Uccle',act:true},
      {nom:'Julie Peeters',email:'j.peeters@latelierby.be',role:'Franchise',portee:'Louvain',act:false},
    ],
    "audit": [
      {ts:'17/07 14:22',user:'Sophie Renard',verb:'Modification',entity:'ws_products #128 (brand_mandatory)',shop:'Réseau'},
      {ts:'17/07 13:05',user:'Thomas Legrand',verb:'Création',entity:'ws_vouchers BXL10',shop:'Bruxelles-Centre'},
      {ts:'17/07 11:40',user:'Sophie Renard',verb:'Modification',entity:'ws_param webshop.enabled',shop:'Réseau'},
      {ts:'16/07 18:12',user:'Marek Kowalski',verb:'Suppression',entity:'ws_office_delivery_sites #44',shop:'Anderlecht'},
      {ts:'16/07 09:30',user:'Sophie Renard',verb:'Création',entity:'bo_users j.peeters',shop:'Louvain'},
    ],
    "fr_alertes": [
      {color:'var(--color-primary)',titre:'Encours dépassé — Belga SPRL',detail:'4 120 € / plafond 4 000 € · commande bloquée'},
      {color:'var(--color-primary)',titre:'Incident — Café Belga',detail:'Colis endommagé · avoir 24 € en attente de décision'},
      {color:'#c9a24b',titre:'Encours à 92 % — Delcourt',detail:'2 760 € / 3 000 € · à surveiller'},
      {color:'#c9a24b',titre:'Écart km — Tournée Uccle / Waterloo',detail:'+24 % vs prévu · détour Waterloo non planifié'},
    ],
    "fr_live_drivers": [
      {color:'#8D1D2C',nom:'Marek Kowalski',info:'BXL-Centre · Renault frigo',avancement:'3/4'},
      {color:'#3B3468',nom:'Julien Dubois',info:'Sud · Iveco Daily',avancement:'1/3'},
    ],
    "fr_clients": [
      {raison:'Le Cirio SA',code:'CL-0021',seg:'horeca',statut:'actif',tva:'BE 0421.111.222',paiement:'30 j fin de mois',plafond:6000,encours:3200,franco:'250 €',remise:'8 %',fact:'Mensuel',points:[
        {libelle:'Brasserie — entrée arrière',adresse:'Rue de la Bourse 18, 1000 Bruxelles',fenetre:'08:00–11:00',jours:'L Ma Me J V S',validation:'QR',marge:230},
      ]},
      {raison:'Rocco Forte',code:'CL-0044',seg:'horeca',statut:'actif',tva:'BE 0455.222.333',paiement:'30 j',plafond:8000,encours:2600,franco:'300 €',remise:'10 %',fact:'Hebdomadaire',points:[
        {libelle:'Cuisine — quai de service',adresse:'Rue de l\'Amigo 1-3, 1000 Bruxelles',fenetre:'07:30–10:00',jours:'L Ma Me J V',validation:'PIN',marge:205},
      ]},
      {raison:'Belga SPRL',code:'CL-0052',seg:'horeca',statut:'suspendu',tva:'BE 0466.333.444',paiement:'7 j',plafond:4000,encours:4120,franco:'—',remise:'5 %',fact:'Par livraison',points:[
        {libelle:'Terrasse — accès Flagey',adresse:'Place Eugène Flagey 18, 1050 Ixelles',fenetre:'09:00–11:30',jours:'Ma Me J V S',validation:'Signature',marge:60},
      ]},
      {raison:'Dandoy',code:'CL-0060',seg:'retail',statut:'actif',tva:'BE 0401.444.555',paiement:'30 j',plafond:5000,encours:1900,franco:'200 €',remise:'6 %',fact:'Mensuel',points:[
        {libelle:'Boutique Sablon — arrière',adresse:'Rue Charles Buls 14, 1000 Bruxelles',fenetre:'08:00–10:30',jours:'L Me V',validation:'QR',marge:180},
      ]},
      {raison:'KBC Group',code:'CL-0071',seg:'corporate',statut:'actif',tva:'BE 0403.227.515',paiement:'30 j fin de mois',plafond:12000,encours:5400,franco:'400 €',remise:'12 %',fact:'Mensuel',points:[
        {libelle:'Cafétéria HQ — hall livraison',adresse:'Havenlaan 2, 3000 Leuven',fenetre:'07:00–09:00',jours:'L Ma Me J V',validation:'PIN',marge:-15},
      ]},
      {raison:'Événements Sud',code:'CL-0088',seg:'event',statut:'prospect',tva:'BE 0788.555.666',paiement:'Comptant',plafond:2000,encours:0,franco:'—',remise:'0 %',fact:'Par livraison',points:[
        {libelle:'Château — accès traiteur',adresse:'Chaussée de Bruxelles 100, 1410 Waterloo',fenetre:'11:00–13:00',jours:'S D',validation:'Dépôt libre',marge:-78},
      ]},
    ],
    "fr_incidents": [
      {type:'Colis endommagé',point:'Café Belga · Ixelles',heure:'aujourd\'hui 09:12',statut:'À traiter',icon:'!',iconBg:'#fbe9eb',iconColor:'var(--color-primary)',ref:'INC-2026-0412',geo:'50.8275, 4.3705',horodatage:'17 juil. 2026 09:12',chauffeur:'Marek Kowalski',impact:'24 €',impactRef:'avoir estimé',description:'Bac isotherme percuté au déchargement. 2 pots de confiture cassés. Photo prise sur place, réception a refusé la ligne.',statutColor:'var(--color-primary)'},
      {type:'Colis manquant',point:'Hôtel Amigo · Sablon',heure:'aujourd\'hui 08:40',statut:'À traiter',icon:'?',iconBg:'var(--color-background-secondary)',iconColor:'var(--color-text-muted)',ref:'INC-2026-0411',geo:'50.8451, 4.3520',horodatage:'17 juil. 2026 08:40',chauffeur:'Marek Kowalski',impact:'46 €',impactRef:'relivraison',description:'1 colis attendu absent au scan de dépôt. Écart détecté sur le bon de chargement.',statutColor:'var(--color-text-muted)'},
      {type:'Livraison refusée',point:'Event Château · Waterloo',heure:'hier 12:58',statut:'En cours',icon:'✕',iconBg:'#fbe9eb',iconColor:'var(--color-primary)',ref:'INC-2026-0407',geo:'50.7147, 4.3990',horodatage:'16 juil. 2026 12:58',chauffeur:'Julien Dubois',impact:'40 €',impactRef:'marchandise perdue',description:'Arrivée hors fenêtre horaire (13:12 vs 11:00–13:00). Client absent, dépôt refusé.',statutColor:'var(--color-primary)'},
      {type:'Retour consigne',point:'Maison Dandoy · Sablon',heure:'hier 11:20',statut:'Résolu',icon:'↩',iconBg:'#eaf5ec',iconColor:'#2d7a3e',ref:'INC-2026-0403',geo:'50.8410, 4.3560',horodatage:'16 juil. 2026 11:20',chauffeur:'Sofie Peeters',impact:'0 €',impactRef:'sans impact',description:'3 bacs consignés récupérés au point. Rapprochement OK.',statutColor:'#2d7a3e'},
    ],
    "fr_rentabilite": [
      {nom:'Tournée Bruxelles-Centre',sites:[
        {nom:'Brasserie Le Cirio',offices:[{nom:'Cuisine RDC',ca:520,couts:210},{nom:'Bar étage',ca:300,couts:150}]},
        {nom:'Hôtel Nord',offices:[{nom:'Réception',ca:580,couts:312}]},
      ]},
      {nom:'Tournée Sud',sites:[
        {nom:'Café des Arts',offices:[{nom:'Salle',ca:415,couts:413}]},
        {nom:'Résidence Les Tilleuls',offices:[{nom:'Accueil',ca:260,couts:180}]},
      ]},
      {nom:'Tournée Est',sites:[
        {nom:'Traiteur Piotrowski',offices:[{nom:'Atelier',ca:740,couts:360}]},
      ]},
    ],
  };
  var DB = null;
  function read(){ try { var r = localStorage.getItem(LS); if (r) return JSON.parse(r); } catch(e){} return null; }
  function persist(){ try { localStorage.setItem(LS, JSON.stringify(DB)); } catch(e){} return DB; }
  function ensure(){ if (DB) return DB; DB = read(); if (!DB){ DB = JSON.parse(JSON.stringify(SEED)); } else { for (var k in SEED){ if (!(k in DB)) DB[k] = JSON.parse(JSON.stringify(SEED[k])); } } persist(); return DB; }
  window.BOServer = {
    table: function(n){ var db = ensure(); return db[n] ? JSON.parse(JSON.stringify(db[n])) : []; },
    all: function(){ return JSON.parse(JSON.stringify(ensure())); },
    getParam: function(key, dflt){ var db = ensure(); var rows = db.params || []; for (var i=0;i<rows.length;i++){ if (rows[i].cle===key){ var r=rows[i]; return (r.val!==undefined ? r.val : (r.def!==undefined ? r.def : dflt)); } } return dflt; },
    setParam: function(key, val){ ensure(); var rows = DB.params || (DB.params = []); var found=false; for (var i=0;i<rows.length;i++){ if (rows[i].cle===key){ rows[i].val=val; found=true; } } if (!found) rows.push({cle:key, type:'bool', val:val}); return persist(); },
    save: function(n, rows){ ensure(); DB[n] = JSON.parse(JSON.stringify(rows)); return persist(); },
    reset: function(){ DB = JSON.parse(JSON.stringify(SEED)); return persist(); }
  };
})();
