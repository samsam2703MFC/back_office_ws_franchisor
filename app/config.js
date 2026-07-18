/* Configuration de la Console marque · Franchiseur (front). */
window.FB_CONFIG = {
  role: 'franchisor',                                  // guard côté API : /bo/franchisor/*
  appUrl: 'back_office_ws_franchisor.dc.html',
  // Base de l'API Franchise Buddy. '' = même origine (/bo/...).
  // Déploiement conseillé : SPA et API sur le MÊME site (sous-domaines d'un même
  // domaine) pour que le cookie SameSite=Lax circule. Surcharge possible en test
  // via ?api=http://127.0.0.1:8080 ou localStorage.FB_API_BASE.
  apiBase: '',
};
