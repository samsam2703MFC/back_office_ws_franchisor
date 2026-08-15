# Répartition du travail entre sessions Claude

Deux sessions Claude travaillent sur les consoles L'Atelier By. Elles ne se
voient pas : chacune découvre le travail de l'autre au moment de fusionner,
c'est-à-dire trop tard. Ça a déjà coûté cher.

## La règle

| Dépôt | Session responsable |
| --- | --- |
| **`back_office_ws_franchisor`** (ce dépôt) | **la session « marque »** |
| `back_office_ws_franchisee` | la session « franchisé » |

**Une session ne modifie que son dépôt.** Si tu as besoin d'un changement dans
l'autre, ne l'écris pas : décris-le à l'utilisateur, qui le portera à la session
concernée. Un même écran vaut mieux implanté une fois dans le bon dépôt que
deux fois dans les deux.

Cette répartition suit ce que chaque session a réellement construit, pas une
préférence. Elle se change en éditant ce tableau — dans les **deux** dépôts.

> **Note du 14/08/2026 — exception ponctuelle demandée explicitement par
> l'utilisateur :** le panneau « Run d'impression — cut-off delivery (réseau) »
> du tableau de bord (méthodes `cutoffCfg`/`cutoffPing`/`cutoffDocHtml`/
> `runCutoff`, panneau du dash) a été écrit par la session « franchisé »,
> branche `claude/cutoff-print-run-network`. Le même jour et sur la même
> branche, elle a aussi écrit les cartes « Directives de réponse — avis
> Google » (méthodes `rgEnsure`/`rgLoad`/`rgSave`/`rgDel`, table
> `ws_review_guidelines` servie par php-api) et « Clés & connexion — avis
> Google » (méthodes `gbEnsure`/`gbTest`/`gbSave`, endpoint
> `/franchisor/gbp-status`) de l'écran Avis. Session marque : ne pas les
> ré-implémenter — reprendre cette branche. La répartition ci-dessus reste
> inchangée pour tout le reste.

## Pourquoi

Trois incidents en une seule journée, tous dus au travail en parallèle :

1. **Deux écrans « Avis clients » ont été écrits en parallèle pour ce dépôt.**
   Celui de la PR #46 a été gardé, l'autre jeté — plusieurs heures pour rien.
2. **Le rendu de la console franchisé a été cassé en production** par une
   fusion qui a gardé des appels de méthodes en perdant leurs définitions.
3. **Des données de démonstration supprimées sont revenues** par une résolution
   de conflit, côté franchisé.

## Avant de fusionner, dans n'importe quel dépôt

```bash
# Aucune méthode appelée ne doit être absente : c'est l'incident nº 2.
python3 - <<'EOF'
import re
s=open('index.html',encoding='utf-8').read()
c=s[s.index('<script type="text/x-dc"'):]
called=set(re.findall(r'this\.([a-zA-Z_][A-Za-z0-9_]*)\(', c))
defined=set(re.findall(r'^\s{2}([a-zA-Z_][A-Za-z0-9_]*)\s*\(', c, re.M))
fields=set(re.findall(r'^\s{2}([a-zA-Z_][A-Za-z0-9_]*)\s*=', c, re.M))
dyn=set(re.findall(r'this\.(_[A-Za-z0-9_]*)\s*=', c))
print('appelées non définies :', sorted(called-defined-fields-dyn-{'setState','setStyle'}) or 'aucune')
EOF
```

Puis, toujours : `node --check` sur les blocs de script, et un parcours des
écrans au navigateur — API absente **et** API présente.

## Règles de fond de ce dépôt

- **Aucune donnée inventée, aucun repli.** `bo_server.js` part de tables vides
  et n'est rempli que par l'API `/franchisor/*` ; toute panne est affichée par
  le bandeau « error please debug » plutôt que masquée par des chiffres
  plausibles.
- **La page servie en production est `index.html`.**
  `back_office_ws_franchisor.dc.html` est l'export Claude Design d'origine et
  a divergé de longue date : ne pas l'utiliser comme source, ne pas écraser
  `index.html` avec (le workflow de déploiement porte la trace de ce bug).
- **Portée réseau assumée.** Cette console est légitimement multi-boutiques et
  son jeton l'est aussi : `/admin/reviews?shopId=` y est correct. Le pendant
  franchisé, lui, doit passer par une route bornée côté serveur — son jeton
  étant réseau, un id lu dans l'URL lui ouvrirait les autres boutiques.
- **Pas de table de traduction ici** : les libellés sont en français dans le
  gabarit, contrairement à la console franchisé (FR/NL/EN/DE/PL). Suivre la
  convention locale plutôt que mélanger les deux.
