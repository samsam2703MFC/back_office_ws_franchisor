# back_office_ws_franchisor

Back-office **WebShop** de L'Atelier By — **Console marque · Siège**
(vue Franchiseur / tête de réseau). Implémentation de la composition Claude
Design `back_office_ws_franchisor.dc.html`.

L'application est une SPA React autonome pilotée par le runtime « dc »
(`support.js`) : le gabarit HTML (`<x-dc>…</x-dc>`) et la logique applicative
(`class Component extends DCLogic`) vivent dans un seul fichier, rendus côté
navigateur. Aucune étape de build n'est nécessaire.

## Écrans

- **Tableau de bord** — KPIs réseau + tableau des boutiques.
- **Boutiques** — parc des points de vente (table `shops` / `ws_shops`).
- **Catalogue** — arborescence catégories / produits, gabarit produit.
- **Promotions** — bons d'achat (vouchers) et grilles tarifaires.
- **Configuration** — paramétrage réseau.
- **Communications** — modèles (templates) e-mail / notifications.
- **Utilisateurs** — comptes et rôles.
- **Journal d'audit** — traçabilité des actions.

Portée « marque » : les valeurs peuvent être diffusées à l'ensemble du réseau
ou restreintes par boutique (sélecteur de portée en barre supérieure).

## Structure

```
index.html                          Point d'entrée (redirige vers la composition)
back_office_ws_franchisor.dc.html   Gabarit + logique + données (composition dc)
support.js                          Runtime dc (compile {{ }} / <sc-if> / <sc-for>, monte React)
vendor/                             Dépendances hébergées localement (aucun CDN requis)
  react.production.min.js           React 18.3.1 (UMD)
  react-dom.production.min.js       ReactDOM 18.3.1 (UMD)
img/logo.png                        Logo L'Atelier By
_ds/l-atelier-by-8504a4e3…/         Design system L'Atelier By
  global.css                          tokens (couleurs, typo, espacements) + composants
  fonts/                              Gotham (UI), Vank (display), Playwrite DEVA (accent)
  _ds_manifest.json, _ds_bundle.js
```

React et ReactDOM sont **hébergés localement** dans `vendor/` (chargés avant
`support.js`, qui saute alors le CDN). Cette console n'utilise pas de carte —
aucune dépendance externe au moment de l'exécution.

## Lancer en local

```bash
python3 -m http.server 8000
# puis ouvrir http://127.0.0.1:8000/
```

Rendu et interactions (navigation, tables, formulaires CRUD, portée réseau /
boutique) vérifiés sous Chromium.

## Authentification (API Franchise Buddy)

La SPA est câblée sur le back-office **franchiseur** (`/bo/franchisor/*`, guard
`franchisor` — cf. `php-api/bo/` du repo WebShop) :

- `app/config.js` — `role: 'franchisor'` + `apiBase` de l'API (`''` = même
  origine ; en test : `?api=http://127.0.0.1:8080`).
- `app/fb-api.js` — client `window.FB` : `fetch` avec `credentials:'include'`
  (cookie `fb_franchisor_session`), header `X-CSRF-Token` sur les mutations,
  **redirection 401 vers `login.html`**, et un **gate** (`GET /bo/franchisor/me`).
- `login.html` — écran de connexion « Console marque · Siège »
  (`POST /bo/franchisor/login`).
- Déconnexion : `window.FB.logout()` ou `…?logout=1`.

> Déploiement : SPA et API sur le **même site** (sous-domaines) pour le cookie
> `SameSite=Lax`.

Flux vérifié sous Chromium (mock API) : gate → login → app (portée réseau,
`shops=null`), rôle `franchisor`.
