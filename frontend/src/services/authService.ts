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

export const authService = {
  // Ne pose pas le cookie de session : POST /auth/inscription crée le compte
  // sans connecter (voir CLAUDE.md, section 2 — inscription et connexion
  // restent deux actions distinctes côté back).
  inscription: (donnees: DonneesInscription): Promise<Utilisateur> =>
    appelApi("/auth/inscription", { methode: "POST", corps: donnees }),

  connexion: (donnees: DonneesConnexion): Promise<{ utilisateur: Utilisateur }> =>
    appelApi("/auth/connexion", { methode: "POST", corps: donnees }),

  profil: (): Promise<Utilisateur> => appelApi("/auth/profil"),

  deconnexion: (): Promise<void> => appelApi("/auth/deconnexion", { methode: "POST" }),
};
