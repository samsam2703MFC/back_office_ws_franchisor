# Audit No-repli / aucune donnée inventée — `back_office_ws_franchisor`

> Audit **en lecture seule**. Aucun fichier existant modifié. Seul fichier écrit : ce rapport.
> **RÈGLE jugée** : `bo_server.js` part de tables **vides** ; toute la donnée métier vient de
> l'API `/franchisor/*` authentifiée (`X-Admin-Token`) ; **toute panne est AFFICHÉE**
> (bandeau « error please debug ») — jamais masquée par un repli, une valeur plausible
> ou un silence. Seules les **configs d'écran** (textes d'UI : `params`, `email_templates`)
> peuvent rester en dur.
> **PÉRIMÈTRE** : tout le repo. **Exclus** (non jugés) : `vendor/` (React vendored),
> `_ds/` (bundle design system), `.git/`, `codes_postaux.geojson` (asset de données géo statique),
> `AUDIT_HARDCODE.md` / `MIGRATION_NOTES.md` (docs). `support.js` (runtime DC, 1841 l.) audité
> en survol : c'est du framework, pas de la donnée métier — voir §8.

## 1. Synthèse

- **Compteurs** : **7 conformes** · **6 à adapter** · **2 manquants** · **~12 occurrences brutes** de repli/masquage.
- La couche de lecture principale est **saine** : `bo_server.js` part vide et hydrate depuis l'API,
  et les écrans lisent via `SRV(table)` (aucune donnée métier en dur dans le gabarit). Les violations
  sont **concentrées** sur des chemins secondaires (rafraîchissements, analyses géo, menu builder).

**5 chantiers prioritaires** (conséquence si on ne fait rien) :
1. **Menu builder écrit en `localStorage` uniquement** (`menu_api.js`, 0 `fetch`) et affiche un faux « ✔ POST /admin/bundles » (`index.html:1807`) → **la marque croit enregistrer des formules ; au rechargement la donnée serveur écrase tout → perte de travail + faux accusé d'enregistrement**. — P1
2. **Handler d'erreur cassé** : `this.czMapMsg(...)` appelé (`index.html:1601,1603`) mais **jamais défini** → sur panne du référentiel codes postaux, la carte des zones **jette une exception au lieu d'afficher le message** → écran muet. — P2
3. **Table de localités en dur** `prLocalites()` (`index.html:1694`) utilisée en repli de l'API géo → **une localité devinée est présentée comme réelle** dans l'analyse prospect. — P2
4. **`.catch(()=>{})` silencieux** sur ~6 `fetch` de donnée (`index.html:1428,1431,1658,1738,1740,1897`) → **pannes invisibles**, l'écran montre un état vide/périmé sans bandeau. — P2
5. **Aucune CI ne vérifie l'invariant** (la vérif « méthodes non définies » de `CLAUDE.md` n'est pas branchée) → `czMapMsg` en est la preuve : un repli/appel cassé repasse à chaque fusion. — P2

## 2. Comment ce repo est organisé (avec chemins)

- **Page servie** : `index.html` (2781 l.) — composant DC inline `<script type="text/x-dc" data-dc-script>`.
- **Source DC** : `back_office_ws_franchisor.dc.html` (2040 l.) — doit porter la **même** logique (cf. incident nº2 de `CLAUDE.md`).
- **Runtime** : `support.js` (1841 l., moteur DC), `vendor/` (React), `_ds/` (design system) — exclus.
- **Couche donnée marque** : `bo_server.js` → `window.BOServer.table(n)` / `.hydrate()` (charge l'API `/franchisor/*`, note les échecs).
- **Couche donnée menu** : `menu_api.js` + `menu_seed.js` — « simulation serveur » du menu builder, **persistée en `localStorage`**.
- **Résolution API** : `api-config.js` → `window.__FR = {base, token}` (base = `<origin>/webshop/api`).
- **Config/CI** : `.github/workflows/deploy.yml` (déploiement SSH/rsync + `.htaccess` no-cache), `.tfb/module.json`.
- **Assets** : `codes_postaux.geojson`, `img/logo.png`, `docs/landing/`.

## 3. Signaux retenus pour cet audit (ce qui, ici, viole la RÈGLE)

1. **Repli explicite** : `srv || localStorage || SEED`, `x || <valeur plausible>`, table de données codée en dur utilisée quand l'API manque.
2. **Masquage de panne** : `.catch(()=>{})`, `r.ok ? json : null/[]` **sans** router l'échec vers le bandeau / un message d'erreur visible.
3. **Écriture non persistée / simulée** : mutation `localStorage` présentée comme un appel serveur (toast « POST … » sans `fetch`).
4. **Donnée plausible inventée** : nombre/label/localité fabriqué côté client pour combler une absence (≠ afficher `0`/`—` honnête, qui est conforme).
5. **Handler d'erreur non fonctionnel** : le chemin « afficher la panne » est cassé (méthode absente) → la panne n'est ni affichée ni gérée.
6. **Absence de garde-fou** : rien en CI n'empêche la réintroduction de 1–5.

> **Non-violations** (conformes par la RÈGLE) : afficher `0`, `—`, une liste vide ou un
> bandeau d'erreur quand l'API ne renvoie rien ; garder `params`/`email_templates` en dur (textes d'UI).

## 4. Tableau principal

| # | Module | Cas d'usage / besoin | Constat (fichier:ligne) | Verdict | Ce qu'il faut faire | Effort | Prio | Conséquence si on ne fait rien |
|---|---|---|---|---|---|---|---|---|
| 1 | Data layer | Charger la donnée marque | `bo_server.js:68-106` hydrate `/franchisor/*`, `noteError` → bandeau | CONFORME | — | — | — | — |
| 2 | Tableau de bord | KPIs réseau | `index.html:1947` `kpis=SRV('kpis')` (vide si API vide) | CONFORME | — | — | — | — |
| 3 | Boutiques / Catalogue | Lister boutiques & assortiment | `index.html:1950,1960` `SRV('shops')`/`SRV('catalog')`; écritures `frPost` surfacées `index.html:1778-1785` | CONFORME | — | — | — | — |
| 4 | Avis clients | Charger les avis (serveur-autoritaire) | `index.html:1353-1359` `avErr` explicite si pas d'API / HTTP | CONFORME | Modèle à généraliser | — | — | — |
| 5 | Utilisateurs & rôles | Profils tablette | `index.html:1515-1520` `throw` si `!r.ok` → `suErr` « please debug » | CONFORME | Modèle à généraliser | — | — | — |
| 6 | Cross-sell | Recharger les règles | `index.html:2432-2436` `Promise.reject(status)` → toast « ⚠ Règles non rechargées » | CONFORME | Router vers bandeau plutôt que toast (cohérence) | S | P3 | Erreur visible mais fugace (toast) |
| 7 | Menu builder | **Éditer bundles/slots/choix** | `menu_api.js` **0 `fetch`** ; écritures `localStorage` ; faux « POST » `index.html:1807` | À ADAPTER | Écrire vers l'API (`/admin/bundle*`) ou geler l'écran ; supprimer le toast mensonger | L | **P1** | **Éditions perdues au rechargement + faux « enregistré »** |
| 8 | Menu builder | Source de la donnée menu | `menu_api.js:17` `DB = srv ? clone(srv) : (read() || clone(SEED))` (repli localStorage→seed) | À ADAPTER | Supprimer le repli `localStorage` : serveur ou vide+erreur | M | P2 | Donnée de menu périmée/locale affichée comme serveur |
| 9 | Prospects | Analyser CP → localité | `index.html:1694` `prLocalites()` table 35 CP en dur ; repli `index.html:1697,1710` | À ADAPTER | Retirer la table ; seule source = API `geo/locality`/`__CPGEO`, sinon état « inconnu » | M | P2 | Localité **devinée** présentée comme réelle → orientation prospect fausse |
| 10 | Zones chalandise | Afficher la panne du référentiel CP | `index.html:1601,1603` `this.czMapMsg(...)` **non défini** | À ADAPTER | Définir le handler (ou router vers le bandeau) | S | P2 | Sur panne référentiel, la carte **jette** au lieu d'afficher → écran muet |
| 11 | Zones chalandise | Rafraîchir les zones | `index.html:1658` `czReload` `.catch(()=>{})` ; `r.ok?json:null` | À ADAPTER | Surfacer l'échec (bandeau) | S | P2 | Zones périmées/vides sans signalement |
| 12 | Géo clients / Traçabilité | Charger points clients + géo | `index.html:1428,1431,1738,1740` `.catch(()=>{})` silencieux | À ADAPTER | Router les échecs vers le bandeau ; `traceStat` ne doit pas dire « hors ligne » sur un 500 | M | P2 | Carte vide/partielle prise pour une réalité |
| 13 | Recherche produit/voucher | Typeahead | `index.html:1897` `r.ok?json:[]` + `.catch(()=>{})` | À ADAPTER | Distinguer « aucun résultat » de « échec » | S | P3 | Recherche silencieusement vide sur panne |
| 14 | Carte (polygones CP) | Charger `codes_postaux` | `index.html:1346` `.catch(()=>{ this._polyLoading=false; })` | À ADAPTER | Signaler l'échec de chargement de l'asset | S | P3 | Contours absents sans explication |
| 15 | Persistance menu | **Écrire les formules côté serveur** | Aucune route d'écriture appelée (`menu_api.js` local) | MANQUANT | Câbler les écritures menu à l'API | L | P1 | (voir #7) |
| 16 | CI / garde-fou | Empêcher le retour du repli | `CLAUDE.md` décrit une vérif **manuelle** ; pas dans `.github/workflows/deploy.yml` | MANQUANT | Étape CI : `node --check` + grep repli + méthodes non définies | S | P2 | `czMapMsg`-like repasse à chaque fusion |

## 5. Violations à supprimer — un bloc par occurrence

**V1 — Faux appel serveur (menu builder).** `index.html:1807`
`moveBundle` fait `this.apply(this.api.moveBundle(...))` (écriture **localStorage**) puis
`this.printJob('↕ POST /admin/bundles · sort_order')`. Aucun `fetch` derrière. Le toast **affirme**
un enregistrement serveur qui n'a pas lieu. → supprimer le toast trompeur (et cf. V2 pour la persistance).

**V2 — Menu builder entièrement local.** `menu_api.js` (tout le fichier) — `grep fetch` = **0**.
En-tête assumé : « *Server simulation … stands in for the /admin/bundle\* API* ». Les 22 mutations
(`this.apply(this.api.*)`, `index.html`) écrivent en `localStorage`. À la lecture, `ensure()`
(`menu_api.js:17`) préfère `window.__FR_MENUS` (serveur) → **les éditions locales sont écrasées au
rechargement**. C'est à la fois un repli (V3) et une écriture non persistée.

**V3 — Chaîne de repli.** `menu_api.js:17`
`DB = srv ? clone(srv) : (read() || clone(SEED))` — serveur → **localStorage** → seed. Le maillon
`read()` (localStorage) peut ressusciter une donnée locale périmée sans qu'aucune panne ne soit affichée.

**V4 — Table de localités en dur.** `index.html:1694` (`prLocalites()`) et son usage `index.html:1697`
(`return L[cp]||null`) via `prLookupLocality`, chemin de repli `index.html:1710`. 35 codes postaux
belges codés en clair, servis quand `window.__CPGEO` (géo serveur) est absent → **localité plausible
inventée**.

**V5 — Handler d'erreur non défini.** `index.html:1601,1603` appellent `this.czMapMsg('⚠ ERREUR … please debug')`.
Aucune définition de `czMapMsg` dans `index.html` (0 def). L'intention (« afficher la panne ») **jette**.
Note : `back_office_ws_franchisor.dc.html` n'a **pas** cet appel (`grep czMapMsg` = 0) → **divergence**
index/dc en plus du handler cassé.

**V6 — Masquages silencieux (`.catch(()=>{})`).** `index.html:1346, 1428, 1431, 1658, 1738, 1740, 1897`
(+ `.catch(()=>null)` 1423/1595, `.catch(()=>false)` 1724). Ces `fetch` de **donnée** (pas de simples
optionnels) avalent l'échec sans le router vers `window.__BO_RENDER_ERRORS` / un message d'écran.

## 6. Existant à adapter — ce qui cloche, ce qui change, qui est impacté

- **Menu builder** (`menu_api.js`, écran Menus, `index.html` ~1807 et méthodes `*Bundle*`/`*Slot*`/`*Choice*`) :
  *cloche* = écriture locale + faux toast ; *changement* = câbler les écritures à l'API ou marquer l'écran
  « lecture seule / à venir » sans simuler d'enregistrement ; *impacté* = toute personne éditant des formules.
- **Prospects** (`index.html:1694-1712`) : *cloche* = table en dur + `.catch → 'manual'` muet ; *changement* =
  source unique = API (`/franchisor/geo/locality`, `__CPGEO`), état « localité inconnue » explicite sinon ;
  *impacté* = orientation des prospects.
- **Zones chalandise** (`index.html:1601-1603, 1658`) : *cloche* = handler `czMapMsg` absent + refresh muet ;
  *changement* = un vrai affichage d'erreur + surfaçage du refresh ; *impacté* = écran zones (déjà sujet à incidents).
- **Géo/Traçabilité** (`index.html:1422-1431, 1738-1740`) : *cloche* = `.catch(()=>{})` + `traceStat`
  « indisponible hors ligne » qui **attribue à tort** un 500 à une absence de réseau ; *changement* = message
  fidèle à la cause (HTTP) via le bandeau ; *impacté* = lecture de la carte clients.
- **Cross-sell** (`index.html:2432`) : *cloche* mineure = erreur en toast fugace, pas au bandeau ; *changement* =
  cohérence de surfaçage ; *impacté* = règles cross-sell.

## 7. Manques transverses (contrat, convention, doc, tests)

- **Contrat de surfaçage d'erreur incohérent** : trois écoles cohabitent — (a) `throw`→bandeau/`suErr`/`avErr`
  (bon : `index.html:1359, 1519`), (b) toast (`index.html:2436`), (c) `.catch(()=>{})` muet (mauvais).
  Aucune convention unique. La RÈGLE impose (a).
- **Doc mensongère** : `api-config.js:9` annonce « *Sur \*.github.io ou si l'API ne répond pas → mode démo
  (seed en mémoire)* ». Faux : `api-config.js:23` met `base=null` sur github.io → `bo_server.hydrate`
  émet un `noteError('fatal')` (bandeau). Il n'existe **pas** de mode démo, et « si l'API ne répond pas »
  n'est pas implémenté (la base dépend du **hostname**, pas de la joignabilité). Doc à corriger.
- **Labels fabriqués** : `'Point de vente #'+id` (`index.html:1711` et carte traçabilité) synthétise un nom
  absent. Toléré (label, pas métrique) mais à signaler.
- **Divergence index/dc** : `czMapMsg` présent (cassé) dans `index.html`, absent de `.dc.html` — rejoue
  l'incident nº2 de `CLAUDE.md`.
- **Tests / CI absents** : `.github/workflows/deploy.yml` ne fait que déployer. La vérif « méthodes appelées
  non définies » + `node --check` de `CLAUDE.md` reste **manuelle** → non appliquée (d'où V5). Aucun test unitaire.

## 8. Zones non couvertes par l'audit

- **`support.js`** (runtime DC, 1841 l.) : survolé, pas de donnée métier ; un audit du moteur de rendu
  (gestion d'erreur interne, `try/catch` du framework) n'a pas été fait.
- **Backend `WebShop/php-api`** (autre dépôt, hors périmètre) : c'est la **vraie** source `/franchisor/*` ;
  cet audit ne juge que le **front**. La conformité réelle dépend aussi de ce que renvoie l'API.
- **Exécution réelle** : audit **statique** (lecture seule). Le comportement runtime (ce que l'utilisateur voit
  vraiment sur panne) n'a pas été observé dans un navigateur.
- **`codes_postaux.geojson` / `_ds/` / `vendor/`** : exclus par périmètre (asset géo, design system, React).
- **`params` / `email_templates`** : conformes par la RÈGLE (textes d'UI), non listés comme violations.
