import { appelApi } from "./api";
import type { Utilisateur } from "../store/authSlice";

export type DonneesConnexion = {
  email: string;
  motDePasse: string;
};

export type DonneesInscription = {
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
  ville?: string;
};

// Réponse de POST /auth/connexion : soit la session est ouverte, soit le compte
// a la double authentification et il reste à envoyer le code, avec ce jeton
// temporaire (5 minutes) qui prouve que le mot de passe a été validé.
export type ReponseConnexion =
  | { doubleAuthRequise: false; utilisateur: Utilisateur }
  | { doubleAuthRequise: true; jetonTemporaire: string };

export const authService = {
  // Ne pose pas le cookie de session : POST /auth/inscription crée le compte
  // sans connecter (voir CLAUDE.md, section 2 — inscription et connexion
  // restent deux actions distinctes côté back).
  inscription: (donnees: DonneesInscription): Promise<Utilisateur> =>
    appelApi("/auth/inscription", { methode: "POST", corps: donnees }),

  connexion: (donnees: DonneesConnexion): Promise<ReponseConnexion> =>
    appelApi("/auth/connexion", { methode: "POST", corps: donnees }),

  // Seconde étape : le code (application d'authentification ou code de secours)
  // ouvre la session.
  connexionDoubleAuth: (jetonTemporaire: string, code: string): Promise<{ utilisateur: Utilisateur }> =>
    appelApi("/auth/connexion/2fa", { methode: "POST", corps: { jetonTemporaire, code } }),

  profil: (): Promise<Utilisateur> => appelApi("/auth/profil"),

  deconnexion: (): Promise<void> => appelApi("/auth/deconnexion", { methode: "POST" }),
};
