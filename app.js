"use strict";
/* ==========================================================================
   L'Atelier By — Console marque (franchiseur) · back_office_ws_franchisor

   Data-driven implementation. This file contains ZERO domain data: every
   shop, product, user, column, colour, label and form is described in
   data.json and fetched at init (mirroring the design system's
   "GET /api/v1/theme" bootstrap). app.js is only a generic render engine.
   ========================================================================== */

var DB = null;                 // the fetched data.json
var state = {
  screen: null, flags: {}, paramNavOpen: false,
  formKey: null, formVals: {}, formEdit: false, toast: ''
};
var toastTimer = null;

/* ----- boot -------------------------------------------------------------- */
function boot(){
  fetch('./data.json', { cache: 'no-store' })
    .then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function(db){
      DB = db;
      // apply theme tokens to :root (design-system init contract)
      Object.keys(DB.theme || {}).forEach(function(k){
        document.documentElement.style.setProperty(k, DB.theme[k]);
      });
      state.screen = DB.defaultScreen;
      (DB.nav || []).forEach(function(b){ if (b.collapsible) state.paramNavOpen = !!b.open; });
      render();
    })
    .catch(function(err){
      document.getElementById('app').innerHTML =
        '<div style="max-width:520px;margin:80px auto;font:400 14px/1.6 var(--font-ui);color:var(--color-text)">'
        + '<div class="t-section-title" style="font-size:20px;margin-bottom:10px">Impossible de charger data.json</div>'
        + '<p style="color:var(--color-text-muted)">Cette application est pilotée par les données (<code>data.json</code>). '
        + 'Servez le dossier plutôt que d\'ouvrir le fichier directement :</p>'
        + '<pre style="background:var(--color-background-secondary);padding:12px 14px;border-radius:8px;overflow:auto">'
        + 'python3 -m http.server 8080\n# puis http://localhost:8080/back_office_ws_franchisor.html</pre>'
        + '<p style="color:var(--color-text-muted);font-size:12px">Détail : ' + esc(String(err && err.message || err)) + '</p></div>';
    });
}

/* ----- state ------------------------------------------------------------- */
function setState(patch){
  if (typeof patch === 'function') patch = patch(state);
  Object.assign(state, patch);
  render();
}

/* ----- helpers ----------------------------------------------------------- */
function eur(n){ return Number(n).toLocaleString('fr-BE', { minimumFractionDigits: 0 }) + ' €'; }
function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function interp(tmpl, ctx){
  return String(tmpl).replace(/\{(\w+)\}/g, function(_, k){ return ctx[k] !== undefined ? ctx[k] : ''; });
}
/* resolve a palette name (or raw colour) to a usable CSS colour */
function col(name){
  if (name == null || name === '') return 'inherit';
  if (DB.palette && DB.palette[name] !== undefined) return DB.palette[name];
  return name; // raw hex / rgb() / var()
}

function pill(bg, c){
  return 'display:inline-flex;align-items:center;font:600 10px var(--font-ui);border-radius:20px;'
       + 'padding:4px 10px;background:' + col(bg) + ';color:' + col(c);
}
function dotStyle(c){ return 'width:7px;height:7px;border-radius:50%;flex:none;background:' + col(c); }

function flagVal(key, def){ return state.flags[key] !== undefined ? state.flags[key] : def; }
function tog(key, def){
  var on = flagVal(key, def);
  return {
    on: on,
    style: 'position:relative;width:38px;height:21px;border-radius:20px;border:none;cursor:pointer;'
         + 'background:' + (on ? 'var(--color-primary)' : 'var(--color-border-secondary)'),
    knob: 'position:absolute;top:2px;left:' + (on ? '19px' : '2px') + ';width:17px;height:17px;'
        + 'border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2)'
  };
}
function flipFlag(key, def){
  setState(function(st){
    var next = {}; next[key] = !flagVal(key, def);
    return { flags: Object.assign({}, st.flags, next) };
  });
}
function printJob(msg){
  setState({ toast: msg });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ setState({ toast: '' }); }, 2600);
}

/* shared inline styles (structure only — colours come from tokens) */
var tableBadge = 'display:inline-flex;align-items:center;font:600 11px var(--font-mono);color:var(--color-text-muted);'
               + 'background:var(--color-background-secondary);border-radius:7px;padding:6px 11px';
var pencilStyle = 'background:transparent;border:.5px solid var(--color-border-tertiary);border-radius:7px;cursor:pointer;'
                + 'color:var(--color-text-muted);width:28px;height:28px;display:flex;align-items:center;justify-content:center;flex:none';
var PENCIL_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">'
               + '<path d="M4 20h3l11-11-3-3L4 17z"/><path d="M14 5l3 3"/></svg>';

/* ==========================================================================
   CELL ENGINE — one column descriptor → one grid cell of HTML
   ========================================================================== */
function thresholdColor(v, thresholds, fallback){
  for (var i = 0; i < (thresholds || []).length; i++) {
    if (v >= thresholds[i].min) return thresholds[i].color;
  }
  return fallback;
}
function editVals(colDef, row){
  var vals = {}, map = colDef.map || {};
  Object.keys(map).forEach(function(target){
    var v = row[map[target]];
    if (colDef.strip && colDef.strip.indexOf(target) !== -1) v = String(v).replace(/\s\d+$/, '');
    vals[target] = v;
  });
  return vals;
}

function cell(colDef, row, ctx){
  var a = colDef.align === 'right' ? ';text-align:right' : (colDef.align === 'center' ? '' : '');
  switch (colDef.type) {
    case 'text':      return '<span style="font:500 12.5px var(--font-ui);color:var(--color-text)' + a + '">' + esc(row[colDef.field]) + '</span>';
    case 'textStrong':return '<span style="font:600 12px var(--font-ui);color:var(--color-text)' + a + '">' + esc(row[colDef.field]) + '</span>';
    case 'muted':     return '<span style="font:400 12px var(--font-ui);color:var(--color-text-muted)' + a + '">' + esc(row[colDef.field]) + '</span>';
    case 'mutedSm':   return '<span style="font:400 11.5px var(--font-ui);color:var(--color-text-muted)' + a + '">' + esc(row[colDef.field]) + '</span>';
    case 'mono':      return '<span style="font:600 11.5px var(--font-mono);color:var(--color-text)' + a + '">' + esc(row[colDef.field]) + '</span>';
    case 'monoMuted': return '<span style="font:400 11px var(--font-mono);color:var(--color-text-muted)' + a + '">' + esc(row[colDef.field]) + '</span>';
    case 'nameAccent':
      return '<div style="display:flex;align-items:center;gap:9px">'
        + '<span style="width:10px;height:10px;border-radius:3px;background:' + col(row[colDef.accent]) + ';flex:none"></span>'
        + '<span style="font:500 12.5px var(--font-ui);color:var(--color-text)">' + esc(row[colDef.field]) + '</span></div>';
    case 'euro': {
      var n = row[colDef.field];
      var txt = (colDef.dashIfZero && !n) ? '—' : eur(n);
      return '<span style="font:600 12px var(--font-ui);color:' + col(colDef.color) + ';text-align:right">' + txt + '</span>';
    }
    case 'thresholdText': {
      var v = row[colDef.field];
      var c = thresholdColor(v, colDef.thresholds, colDef['else']);
      return '<span style="font:600 12px var(--font-ui);color:' + col(c) + ';text-align:right">' + esc(v) + esc(colDef.suffix || '') + '</span>';
    }
    case 'pill': {
      var m = colDef.map && colDef.map[row[colDef.field]];
      var st = m || colDef.style || { bg: 'bgSec', fg: 'muted' };
      return '<div style="display:flex;justify-content:' + (colDef.align === 'center' ? 'center' : 'flex-start') + '">'
        + '<span style="' + pill(st.bg, st.fg) + '">' + esc(row[colDef.field]) + '</span></div>';
    }
    case 'pillText': {
      var mm = colDef.map && colDef.map[row[colDef.field]] || { bg: 'bgSec', fg: 'muted' };
      return '<div style="display:flex;align-items:center;gap:7px">'
        + '<span style="' + pill(mm.bg, mm.fg) + '">' + esc(row[colDef.field]) + '</span>'
        + '<span style="font:400 11.5px var(--font-ui);color:var(--color-text-muted)">' + esc(row[colDef.text]) + '</span></div>';
    }
    case 'statePill': {
      var key = interp(colDef.flag, ctx), on = flagVal(key, row[colDef.def]);
      var s = on ? colDef.on : colDef.off;
      return '<div style="display:flex;justify-content:center"><span style="' + pill(s.bg, s.fg) + '">' + esc(s.text) + '</span></div>';
    }
    case 'toggle': {
      var tk = interp(colDef.flag, ctx), t = tog(tk, row[colDef.def]);
      return '<div style="display:flex;justify-content:' + (colDef.align === 'center' ? 'center' : 'flex-start') + '">'
        + '<button data-act="flip" data-key="' + esc(tk) + '" data-def="' + (row[colDef.def] ? 1 : 0) + '" style="' + t.style + '">'
        + '<span style="' + t.knob + '"></span></button></div>';
    }
    case 'edit':
      return '<div style="display:flex;justify-content:flex-end"><button data-act="editRow" data-form="' + esc(colDef.form)
        + '" data-vals="' + esc(JSON.stringify(editVals(colDef, row))) + '" style="' + pencilStyle + '">' + PENCIL_SVG + '</button></div>';
  }
  return '<span></span>';
}

function gridCols(columns){ return columns.map(function(c){ return c.w; }).join(' '); }

function tableHead(columns){
  var cells = columns.map(function(c){
    if (!c.header) return '<span></span>';
    var a = c.align === 'right' ? ' style="text-align:right"' : (c.align === 'center' ? ' style="text-align:center"' : '');
    return '<span class="t-admin-label"' + a + '>' + esc(c.header) + '</span>';
  }).join('');
  return '<div style="display:grid;grid-template-columns:' + gridCols(columns) + ';padding:8px 6px;border-bottom:.5px solid var(--color-border-tertiary)">' + cells + '</div>';
}
function tableRows(columns, rows){
  return rows.map(function(row, i){
    var ctx = { i: i, id: row.id };
    var cells = columns.map(function(c){ return cell(c, row, ctx); }).join('');
    return '<div style="display:grid;grid-template-columns:' + gridCols(columns) + ';align-items:center;padding:11px 6px;border-bottom:.5px solid var(--color-border-tertiary)">' + cells + '</div>';
  }).join('');
}

/* ==========================================================================
   CHROME — sidebar + header, both driven by DB.brand / DB.nav
   ========================================================================== */
function navItemStyle(screen){
  var on = state.screen === screen;
  return 'display:flex;align-items:center;gap:11px;width:100%;padding:11px 12px;border:none;border-radius:9px;'
       + 'cursor:pointer;font:' + (on ? '600' : '500') + ' 13px/1 var(--font-ui);text-align:left;'
       + (on ? 'background:var(--color-primary);color:#fff' : 'background:transparent;color:var(--color-text)');
}
function renderSidebar(){
  var b = DB.brand;
  var blocks = (DB.nav || []).map(function(grp){
    var open = grp.collapsible ? state.paramNavOpen : true;
    var head;
    if (grp.collapsible) {
      var chev = 'flex:none;transition:transform .15s' + (open ? ';transform:rotate(90deg)' : '');
      head = '<button data-act="navToggle" style="display:flex;align-items:center;gap:8px;width:100%;padding:9px 12px;margin:14px 0 2px;'
        + 'border:none;border-radius:8px;cursor:pointer;text-align:left;background:transparent;color:var(--color-text-muted)">'
        + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="' + chev + '"><path d="M9 6l6 6-6 6"/></svg>'
        + '<span style="flex:1;font:600 10px/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase">' + esc(grp.label) + '</span></button>';
    } else {
      head = '<div style="margin:14px 8px 6px;font:600 10px/1 var(--font-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--color-text-muted)">' + esc(grp.label) + '</div>';
    }
    var items = open ? grp.items.map(function(it){
      var dc = state.screen === it.screen ? '#fff' : col(it.dot);
      return '<button data-act="go" data-screen="' + esc(it.screen) + '" style="' + navItemStyle(it.screen) + '">'
        + '<span style="' + dotStyle(dc) + '"></span><span style="flex:1;text-align:left">' + esc(it.label) + '</span></button>';
    }).join('') : '';
    return head + items;
  }).join('');

  return '<aside style="background:var(--color-surface);border-right:.5px solid var(--color-border-tertiary);display:flex;flex-direction:column;overflow:hidden">'
    + '<div style="padding:18px 20px 15px;border-bottom:.5px solid var(--color-border-tertiary)">'
    +   '<img src="' + esc(b.logo) + '" alt="' + esc(b.logoAlt) + '" style="height:30px;width:auto;display:block"/>'
    +   '<div style="display:flex;align-items:center;gap:7px;margin-top:9px"><span style="width:7px;height:7px;border-radius:50%;background:var(--color-primary)"></span>'
    +     '<span style="font:600 10px/1 var(--font-ui);letter-spacing:.09em;text-transform:uppercase;color:var(--color-primary)">' + esc(b.consoleLabel) + '</span></div></div>'
    + '<nav class="lz" style="flex:1;overflow-y:auto;padding:10px 12px 20px;display:flex;flex-direction:column;gap:3px">'
    +   '<a href="#" style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:4px;border-radius:8px;background:var(--color-background-secondary);color:var(--color-text-muted);font:500 12px/1 var(--font-ui)">'
    +     '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 19l-7-7 7-7"/><path d="M3 12h18"/></svg><span>' + esc(b.backLink) + '</span></a>'
    +   blocks
    + '</nav>'
    + '<div style="padding:12px 16px;border-top:.5px solid var(--color-border-tertiary);display:flex;align-items:center;gap:10px">'
    +   '<div style="width:30px;height:30px;border-radius:50%;background:var(--color-primary);color:#fff;display:flex;align-items:center;justify-content:center;font:600 12px var(--font-ui)">' + esc(b.user.initials) + '</div>'
    +   '<div style="line-height:1.2"><div style="font:500 12px var(--font-ui);color:var(--color-text)">' + esc(b.user.name) + '</div>'
    +     '<div style="font:400 10px var(--font-ui);color:var(--color-text-muted)">' + esc(b.user.role) + '</div></div></div>'
    + '</aside>';
}
function renderHeader(sc){
  return '<header style="height:58px;flex:none;background:var(--color-surface);border-bottom:.5px solid var(--color-border-tertiary);display:flex;align-items:center;justify-content:space-between;padding:0 22px;gap:16px">'
    + '<div style="display:flex;align-items:baseline;gap:12px;min-width:0;flex:1">'
    +   '<h1 class="t-page-title" style="font-size:21px;margin:0;white-space:nowrap">' + esc(sc.title) + '</h1>'
    +   '<span style="font:400 12px var(--font-ui);color:var(--color-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(sc.sub) + '</span></div>'
    + '<div style="display:flex;align-items:center;gap:12px;flex:none"><span style="font:400 12px var(--font-ui);color:var(--color-text-muted);white-space:nowrap">' + esc(DB.brand.date) + '</span></div>'
    + '</header>';
}

/* ----- reusable pieces --------------------------------------------------- */
function card(inner){ return '<div style="background:var(--color-surface);border:.5px solid var(--color-border-tertiary);border-radius:12px;padding:20px">' + inner + '</div>'; }
function addBtn(add){
  if (!add) return '';
  var cls = add.variant === 'secondary' ? 'btn-secondary' : 'btn-primary';
  return '<button data-act="openForm" data-key="' + esc(add.form) + '" class="' + cls + '" style="font-size:12px;flex:none">' + esc(add.label) + '</button>';
}
function ds(name){ return (DB.datasets && DB.datasets[name]) || []; }

/* ==========================================================================
   SCREEN KINDS
   ========================================================================== */
function renderTableScreen(sc){
  var table = tableHead(sc.columns) + tableRows(sc.columns, ds(sc.dataset));
  var footer = sc.footer ? '<div style="margin-top:12px;background:var(--color-background-secondary);border-radius:9px;padding:11px 13px;font:400 11px/1.6 var(--font-ui);color:var(--color-text-muted)">' + sc.footer + '</div>' : '';

  // Card-title shape: title + backing-table badge sit inside the card
  // (e.g. the audit log). No separate top action row.
  if (sc.cardTitle) {
    var inner = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">'
      + '<div class="t-section-title" style="font-size:15px">' + esc(sc.cardTitle) + '</div>'
      + '<span style="' + tableBadge + '">' + esc(sc.badge) + '</span></div>';
    if (sc.note) inner += '<div style="font:400 11px var(--font-ui);color:var(--color-text-muted);margin-bottom:14px">' + esc(sc.note) + '</div>';
    return '<div style="display:flex;flex-direction:column;gap:16px">' + card(inner + table + footer) + '</div>';
  }

  // Top-badge shape: [backing-table badge | + Add] row, then a plain table card.
  var header = '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px">'
    + '<span style="' + tableBadge + '">' + esc(sc.badge) + '</span>' + addBtn(sc.add) + '</div>';
  return '<div style="display:flex;flex-direction:column;gap:16px">' + header + card(table + footer) + '</div>';
}

function renderDashboard(sc){
  var kpiCards = ds(sc.kpis).map(function(k){
    return '<div style="background:var(--color-surface);border:.5px solid var(--color-border-tertiary);border-radius:12px;padding:16px">'
      + '<div class="t-admin-label">' + esc(k.label) + '</div>'
      + '<div style="font:700 26px/1 var(--font-ui);color:' + col(k.valColor) + ';margin:9px 0 4px">' + esc(k.value) + '</div>'
      + '<div style="font:400 11px var(--font-ui);color:' + col(k.deltaColor) + '">' + esc(k.delta) + '</div></div>';
  }).join('');
  var t = sc.table;
  var tableCard = card(
    '<div class="t-section-title" style="font-size:15px;margin-bottom:3px">' + esc(t.title) + '</div>'
    + '<div style="font:400 11px var(--font-ui);color:var(--color-text-muted);margin-bottom:14px">' + esc(t.note) + '</div>'
    + tableHead(t.columns) + tableRows(t.columns, ds(t.dataset)));
  return '<div style="display:flex;flex-direction:column;gap:18px">'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">' + kpiCards + '</div>'
    + tableCard + '</div>';
}

function renderCatalogue(sc){
  var grid = gridCols(sc.columns);
  var stPill = function(s){ var m = sc.statusMap[s] || { bg: 'bgSec', fg: 'muted' }; return pill(m.bg, m.fg); };
  var body = '';
  ds(sc.dataset).forEach(function(c, ci){
    var ok = 'catO_' + ci, open = flagVal(ok, true);
    var nbWeb = c.prods.filter(function(p, pi){ return flagVal('bw_' + ci + '_' + pi, p.bw); }).length;
    body += '<div data-act="flip" data-key="' + ok + '" data-def="1" style="display:flex;align-items:center;gap:10px;padding:11px 8px;background:var(--color-background-secondary);border-radius:8px;margin-top:8px;cursor:pointer">'
      + '<span style="width:14px;color:var(--color-text-muted);flex:none;font-size:11px">' + (open ? '▾' : '▸') + '</span>'
      + '<span style="font:600 12px var(--font-ui);text-transform:uppercase;letter-spacing:.05em;color:var(--color-text);flex:1">' + esc(c.cat) + '</span>'
      + '<span style="font:400 11px var(--font-ui);color:var(--color-text-muted)">' + c.prods.length + ' produits · ' + nbWeb + ' en ligne</span></div>';
    if (!open) return;
    c.prods.forEach(function(p, pi){
      var bw = tog('bw_' + ci + '_' + pi, p.bw), bm = tog('bm_' + ci + '_' + pi, p.bm);
      var pk = 'prix_' + ci + '_' + pi, pv = flagVal(pk, p.prix);
      var adColor = thresholdColor(p.ad, sc.adThresholds, sc.adElse);
      var saison = p.saison ? '<span style="' + pill(sc.seasonPill.bg, sc.seasonPill.fg) + '">◷ ' + esc(p.saison) + '</span>' : '';
      var editV = { nom: p.nom, cat: c.cat, prix: p.prix };
      body += '<div style="display:grid;grid-template-columns:' + grid + ';align-items:center;padding:10px 6px 10px 22px;border-bottom:.5px solid var(--color-border-tertiary)">'
        + '<div style="display:flex;align-items:center;gap:8px;min-width:0"><span style="font:500 12.5px var(--font-ui);color:var(--color-text)">' + esc(p.nom) + '</span>'
        +   '<span style="' + stPill(p.statut) + '">' + esc(p.statut) + '</span>' + saison + '</div>'
        + '<div style="display:flex;justify-content:flex-end"><input type="number" step="0.01" value="' + esc(pv) + '" data-inp="setFlag" data-key="' + pk + '" '
        +   'style="width:70px;text-align:right;border:.5px solid var(--color-border-secondary);border-radius:7px;padding:6px 7px;font:600 12px var(--font-ui);color:var(--color-text);background:var(--color-surface)"/></div>'
        + '<div style="display:flex;justify-content:center"><button data-act="flip" data-key="bw_' + ci + '_' + pi + '" data-def="' + (p.bw?1:0) + '" style="' + bw.style + '"><span style="' + bw.knob + '"></span></button></div>'
        + '<div style="display:flex;justify-content:center"><button data-act="flip" data-key="bm_' + ci + '_' + pi + '" data-def="' + (p.bm?1:0) + '" style="' + bm.style + '"><span style="' + bm.knob + '"></span></button></div>'
        + '<div style="display:flex;align-items:center;gap:7px"><div style="flex:1;height:7px;background:var(--color-background-secondary);border-radius:5px;overflow:hidden"><div style="width:' + p.ad + '%;height:100%;background:' + col(adColor) + ';border-radius:5px"></div></div>'
        +   '<span style="font:600 10px var(--font-ui);color:var(--color-text-muted);width:30px;text-align:right">' + p.ad + ' %</span></div>'
        + '<div style="display:flex;justify-content:flex-end"><button data-act="editRow" data-form="product" data-vals="' + esc(JSON.stringify(editV)) + '" style="' + pencilStyle + '">' + PENCIL_SVG + '</button></div></div>';
    });
  });
  return '<div style="display:flex;flex-direction:column;gap:16px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><span style="' + tableBadge + '">' + esc(sc.badge) + '</span>'
    +   '<span style="font:400 11px var(--font-ui);color:var(--color-text-muted)">' + esc(sc.badgeAside) + '</span></div>'
    + card('<div style="font:400 11px/1.5 var(--font-ui);color:var(--color-text-muted);margin-bottom:12px">' + sc.note + '</div>' + tableHead(sc.columns) + body)
    + '</div>';
}

function renderPromos(sc){
  var v = sc.vouchers, scopeBadge = pill('infoBg', 'info');
  var cards = ds(v.dataset).map(function(x){
    return '<div style="border:.5px solid var(--color-border-tertiary);border-radius:12px;padding:14px 16px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
      +   '<span style="font:700 14px var(--font-mono);color:var(--color-primary);letter-spacing:.05em">' + esc(x.code) + '</span>'
      +   '<span style="' + scopeBadge + '">' + esc(v.scopeBadge) + '</span></div>'
      + '<div style="font:500 13px var(--font-ui);color:var(--color-text)">' + esc(x.valeur) + '</div>'
      + '<div style="font:400 11px var(--font-ui);color:var(--color-text-muted);margin-top:2px">' + esc(x.type) + ' · ' + esc(x.validite) + '</div></div>';
  }).join('');
  var p = sc.pricing;
  var pricingCard = card(
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div>'
    + '<div class="t-section-title" style="font-size:15px">' + esc(p.title) + '</div>'
    + '<div style="font:400 11px var(--font-ui);color:var(--color-text-muted)">' + esc(p.note) + '</div></div>' + addBtn(p.add) + '</div>'
    + tableHead(p.columns) + tableRows(p.columns, ds(p.dataset)));
  var vouchersCard = card(
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div>'
    + '<div class="t-section-title" style="font-size:15px">' + esc(v.title) + '</div>'
    + '<div style="font:400 11px var(--font-ui);color:var(--color-text-muted)">' + esc(v.note) + '</div></div>' + addBtn(v.add) + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">' + cards + '</div>');
  return '<div style="display:flex;flex-direction:column;gap:16px">' + vouchersCard + pricingCard + '</div>';
}

function renderParams(sc){
  var head = '<div style="display:grid;grid-template-columns:1.4fr 1.6fr .9fr;padding:8px 6px;border-bottom:.5px solid var(--color-border-tertiary)">'
    + '<span class="t-admin-label">Clé</span><span class="t-admin-label">Valeur</span><span class="t-admin-label" style="text-align:center">Type</span></div>';
  var rows = ds(sc.dataset).map(function(pr, i){
    var valCell;
    if (pr.type === 'bool') {
      var t = tog('param_' + i, pr.def);
      valCell = '<div style="display:flex"><button data-act="flip" data-key="param_' + i + '" data-def="' + (pr.def?1:0) + '" style="' + t.style + '"><span style="' + t.knob + '"></span></button></div>';
    } else {
      var k = 'paramv_' + i, val = flagVal(k, pr.val);
      valCell = '<input type="text" value="' + esc(val) + '" data-inp="setFlag" data-key="' + k + '" '
        + 'style="width:100%;border:.5px solid var(--color-border-secondary);border-radius:7px;padding:7px 9px;font:500 12px var(--font-ui);color:var(--color-text);background:var(--color-surface)"/>';
    }
    return '<div style="display:grid;grid-template-columns:1.4fr 1.6fr .9fr;align-items:center;padding:10px 6px;border-bottom:.5px solid var(--color-border-tertiary)">'
      + '<span style="font:600 11.5px var(--font-mono);color:var(--color-text)">' + esc(pr.cle) + '</span>' + valCell
      + '<span style="font:400 11px var(--font-ui);color:var(--color-text-muted);text-align:center">' + esc(pr.type === 'bool' ? 'bool' : 'text') + '</span></div>';
  }).join('');
  var inner = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">'
    + '<div class="t-section-title" style="font-size:15px">' + esc(sc.cardTitle) + '</div><span style="' + tableBadge + '">' + esc(sc.badge) + '</span></div>'
    + '<div style="font:400 11px var(--font-ui);color:var(--color-text-muted);margin-bottom:14px">' + esc(sc.note) + '</div>' + head + rows;
  return '<div style="display:flex;flex-direction:column;gap:16px">' + card(inner) + '</div>';
}

var KINDS = { dashboard: renderDashboard, table: renderTableScreen, catalogue: renderCatalogue, promos: renderPromos, params: renderParams };

/* ==========================================================================
   MODAL — create/edit form, driven by DB.forms
   ========================================================================== */
function formDef(key){ return DB.forms[key]; }
function openForm(key){
  var c = formDef(key), v = {};
  c.fields.forEach(function(f){
    v[f.k] = f.type === 'checks' ? [] : (f.type === 'bool' ? (f.def !== undefined ? f.def : false) : (f.def !== undefined ? f.def : ''));
  });
  setState({ formKey: key, formVals: v, formEdit: false });
}
function editForm(key, vals){
  var c = formDef(key), v = {};
  c.fields.forEach(function(f){
    if (f.type === 'checks') v[f.k] = (vals && Array.isArray(vals[f.k])) ? vals[f.k] : [];
    else if (f.type === 'bool') v[f.k] = (vals && vals[f.k] !== undefined) ? vals[f.k] : (f.def !== undefined ? f.def : false);
    else v[f.k] = (vals && vals[f.k] !== undefined && vals[f.k] !== '') ? vals[f.k] : (f.def !== undefined ? f.def : '');
  });
  setState({ formKey: key, formVals: v, formEdit: true });
}
function closeForm(){ setState({ formKey: null }); }
function submitForm(){
  var c = formDef(state.formKey); if (!c) return;
  var ed = state.formEdit; setState({ formKey: null });
  printJob((ed ? '✔ Mis à jour dans ' : '✔ Enregistré dans ') + c.table);
}
function flipFormBool(k){ setState(function(st){ var fv = Object.assign({}, st.formVals); fv[k] = !fv[k]; return { formVals: fv }; }); }
function toggleFormCheck(k, opt){
  setState(function(st){
    var cur = Array.isArray(st.formVals[k]) ? st.formVals[k].slice() : [];
    var i = cur.indexOf(opt); if (i === -1) cur.push(opt); else cur.splice(i, 1);
    var fv = Object.assign({}, st.formVals); fv[k] = cur; return { formVals: fv };
  });
}
function renderModal(){
  if (!state.formKey) return '';
  var c = formDef(state.formKey);
  var inputBase = 'width:100%;padding:11px 12px;border:.5px solid var(--color-border-secondary);border-radius:9px;'
    + 'font:400 13px var(--font-ui);color:var(--color-text);background:var(--color-surface);box-sizing:border-box';
  var areaStyle = inputBase + ';min-height:96px;resize:vertical;font-family:var(--font-ui)';
  var fields = c.fields.map(function(f){
    var val = state.formVals[f.k] !== undefined ? state.formVals[f.k] : '';
    var inner;
    if (f.type === 'select') {
      inner = '<select data-inp="formField" data-k="' + f.k + '" style="' + inputBase + '">'
        + (f.options || []).map(function(o){ return '<option value="' + esc(o) + '"' + (String(val) === String(o) ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('')
        + '</select>';
    } else if (f.type === 'number') {
      inner = '<input type="number" value="' + esc(val) + '" data-inp="formField" data-k="' + f.k + '" style="' + inputBase + '"/>';
    } else if (f.type === 'area') {
      inner = '<textarea data-inp="formField" data-k="' + f.k + '" placeholder="' + esc(f.ph || '') + '" style="' + areaStyle + '">' + esc(val) + '</textarea>';
    } else if (f.type === 'checks') {
      var arr = Array.isArray(val) ? val : [];
      inner = '<div style="display:flex;flex-wrap:wrap;gap:7px">' + (f.options || []).map(function(o){
        var on = arr.indexOf(o) !== -1;
        var st = 'border:none;cursor:pointer;border-radius:20px;padding:7px 13px;font:600 11.5px var(--font-ui);'
          + (on ? 'background:var(--color-primary);color:#fff' : 'background:var(--color-background-secondary);color:var(--color-text-muted)');
        return '<button data-act="formCheck" data-k="' + f.k + '" data-opt="' + esc(o) + '" style="' + st + '">' + esc(o) + '</button>';
      }).join('') + '</div>';
    } else if (f.type === 'bool') {
      var bOn = !!val;
      var bStyle = 'position:relative;width:44px;height:24px;border-radius:20px;border:none;cursor:pointer;background:' + (bOn ? 'var(--color-primary)' : 'var(--color-border-secondary)');
      var bKnob = 'position:absolute;top:2px;left:' + (bOn ? '22px' : '2px') + ';width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2)';
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

/* ==========================================================================
   MAIN RENDER
   ========================================================================== */
function render(){
  if (!DB) return;
  var sc = DB.screens[state.screen] || DB.screens[DB.defaultScreen];
  var main = (KINDS[sc.kind] || renderTableScreen)(sc);
  document.getElementById('app').innerHTML =
    '<div style="display:grid;grid-template-columns:250px 1fr;height:100vh;background:var(--color-bg);overflow:hidden">'
    + renderSidebar()
    + '<div style="display:flex;flex-direction:column;overflow:hidden">'
    +   renderHeader(sc)
    +   '<main class="lz" style="flex:1;overflow-y:auto;padding:24px 26px 60px">' + main + '</main>'
    + '</div>' + renderToast() + renderModal() + '</div>';
}

/* ==========================================================================
   EVENTS — one click + one input listener for the whole app
   ========================================================================== */
function findAct(el){
  while (el && el !== document.body) {
    if (el.getAttribute) {
      if (el.getAttribute('data-act')) return el;
      if (el.getAttribute('data-stop')) return null; // dialog dead-space: don't reach backdrop
    }
    el = el.parentNode;
  }
  return null;
}
document.addEventListener('click', function(e){
  var el = findAct(e.target); if (!el) return;
  switch (el.getAttribute('data-act')) {
    case 'go':        setState({ screen: el.getAttribute('data-screen') }); break;
    case 'navToggle': setState(function(st){ return { paramNavOpen: !st.paramNavOpen }; }); break;
    case 'flip':      flipFlag(el.getAttribute('data-key'), el.getAttribute('data-def') === '1'); break;
    case 'openForm':  openForm(el.getAttribute('data-key')); break;
    case 'editRow':   editForm(el.getAttribute('data-form'), JSON.parse(el.getAttribute('data-vals') || '{}')); break;
    case 'formClose': closeForm(); break;
    case 'formSubmit':submitForm(); break;
    case 'formBool':  flipFormBool(el.getAttribute('data-k')); break;
    case 'formCheck': toggleFormCheck(el.getAttribute('data-k'), el.getAttribute('data-opt')); break;
  }
});
document.addEventListener('input', function(e){
  var el = e.target, inp = el.getAttribute && el.getAttribute('data-inp');
  if (!inp) return;
  // in-place update WITHOUT a re-render, so the focused field keeps focus/caret
  if (inp === 'setFlag') { state.flags = Object.assign({}, state.flags); state.flags[el.getAttribute('data-key')] = el.value; }
  else if (inp === 'formField') { state.formVals = Object.assign({}, state.formVals); state.formVals[el.getAttribute('data-k')] = el.value; }
});

/* ----- go ---------------------------------------------------------------- */
boot();
