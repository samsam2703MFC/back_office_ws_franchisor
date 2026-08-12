// Menu Builder — GO-LIVE : AUCUNE donnée de démonstration.
// L'ancien seed (« Menu du Midi », Quiche lorraine, Formule Enfant, Brunch…)
// montrait des formules fictives comme si elles existaient. La SEULE source
// est le serveur : /franchisor/menus → window.__FR_MENUS (hydraté avant le
// boot, cf. index.html). Sans réponse serveur, le builder part VIDE et le
// bandeau d'erreur du boot signale l'échec (« please debug »).
// Structure : { _categories: { <cat>: { menu_default: 0|1 } }, <productId>: {…} }
export const SEED = {
  _categories: {}
};
