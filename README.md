# back_office_ws_franchisor

**Console marque (siège)** — the franchisor / head-office back-office for the
**L'Atelier By** webshop. This is a standalone implementation of the
`back_office_ws_franchisor.dc.html` design from the L'Atelier By design system.

## Running

The app is **data-driven**: it fetches `data.json` at startup, so it must be
served over HTTP (opening the file directly is blocked by the browser's
`file://` fetch policy — the page shows a hint if you do).

```bash
python3 -m http.server 8080
# then visit http://localhost:8080/back_office_ws_franchisor.html
```

No build step and no external runtime.

## Architecture — data-driven, no hardcoding

The implementation is split so that **all content and configuration live in
data, and the code is a generic engine** — mirroring the design system's own
rule ("theme is fetched once on app init and applied to `:root`… zero hardcoded
colours, fonts or spacing in component code").

- **`data.json`** — the single source of truth. Theme tokens, brand strings,
  navigation, per-screen configuration (layout kind, backing-table label,
  **column schemas**), every dataset (shops, catalogue, vouchers, params,
  templates, users, audit…) and all form definitions.
- **`app.js`** — a generic render engine containing **zero domain data**. On
  boot it fetches `data.json`, applies `theme` to `:root` via
  `style.setProperty`, then renders each screen from its config. A small cell
  engine turns a column descriptor (`{type, field, align, map, …}`) into a grid
  cell — `text`, `muted`, `mono`, `euro`, `pill`, `statePill`, `toggle`,
  `thresholdText`, `nameAccent`, `edit`, etc. Colours are referenced by
  palette name and resolved against `data.json`'s `palette` map.

Changing a shop, a price, a colour, a column or a whole screen is a `data.json`
edit — no JavaScript changes required. This is also what a real deployment
would do: swap the static `data.json` for the brand/theme/catalogue API.

## What it does

A single-page admin console with eight screens, driven by a tiny vanilla-JS
state container (`app.js`) that re-renders on every change. No framework.

| Screen | Purpose | Backing tables (labelled in-UI) |
| --- | --- | --- |
| **Tableau de bord réseau** | Consolidated network KPIs + per-shop revenue & whitelist adoption | — |
| **Boutiques** | Per-shop identity, branding, webshop / active toggles | `ws_shops ← franchise_shops` |
| **Journal d'audit** | Trace of sensitive writes (actor, action, entity, shop) | `bo_audit` |
| **Catalogue** | Category → product tree, reference price, webshop whitelist, mandatory flag, adoption | `ws_products · product_categories · ws_season` |
| **Promotions réseau** | Network-scoped vouchers (`shop_id NULL`) + pricing rules | `ws_vouchers · ws_pricing_rules` |
| **Config marque** | Whitelisted brand parameters (flags, URLs, deadlines) | `ws_param` |
| **Communications** | Transactional email templates (key × language × brand) | `ws_email_templates` |
| **Utilisateurs & rôles** | Back-office accounts + scope (RBAC) | `bo_users · bo_user_shops` |

Interactions implemented: sidebar navigation with a collapsible *Paramétrage*
group, live toggles (webshop / active / mandatory / boolean params), inline
price and parameter editing, expandable catalogue categories, adoption progress
bars, and a create/edit modal (text / number / select / textarea / multi-select
chips / boolean) that emits a confirmation toast on save.

## Design system

All colours, typography and spacing come from the L'Atelier By design system
tokens (see the `:root` block in `back_office_ws_franchisor.html`):

- **Ruby Red** `#8D1D2C` — primary actions, badges, active nav
- **Abricot** `#F2C9A0` / **Old Copper** accents — per-shop branding
- **Beige** `#EAE4DC` page background, white surfaces
- Fonts: **Gotham** (UI) + **Vank** (display). These are referenced from the
  design system's `_ds/.../fonts/` folder; when those brand-font binaries are
  not present the page falls back to a system sans/serif stack, so layout and
  colour stay intact.

## Files

- `back_office_ws_franchisor.html` — page shell + design tokens + component CSS
- `data.json` — all data & configuration (the single source of truth)
- `app.js` — generic render engine (fetches `data.json`; no domain data)
- `img/logo.png` — L'Atelier By wordmark
