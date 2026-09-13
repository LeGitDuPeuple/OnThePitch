// Cache local du profil affiché à l'écran, pour éviter un flash "déconnecté" au
// rechargement de la page. Ce n'est qu'un affichage optimiste : la vraie vérité
// vient toujours du serveur (le cookie de session est httpOnly, jamais lu ici) —
// voir hooks/useHydrateAuth.ts.
const CLE_UTILISATEUR = "onthepitch_utilisateur";

export const stockageAuth = {
  lireUtilisateur<T>(): T | null {
    try {
      const brut = localStorage.getItem(CLE_UTILISATEUR);
      return brut ? (JSON.parse(brut) as T) : null;
    } catch {
      return null;
    }
  },

  enregistrer(utilisateur: unknown): void {
    try {
      localStorage.setItem(CLE_UTILISATEUR, JSON.stringify(utilisateur));
    } catch {
      // Stockage indisponible (navigation privée, quota) : pas grave, juste un flash au reload.
    }
  },

  effacer(): void {
    try {
      localStorage.removeItem(CLE_UTILISATEUR);
    } catch {
      // idem
    }
  },
};
