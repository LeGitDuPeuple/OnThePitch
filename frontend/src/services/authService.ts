import { appelApi } from "./api";
import type { Utilisateur } from "../store/authSlice";

export type DonneesConnexion = {
  email: string;
  motDePasse: string;
};

export const authService = {
  connexion: (donnees: DonneesConnexion): Promise<{ utilisateur: Utilisateur }> =>
    appelApi("/auth/connexion", { methode: "POST", corps: donnees }),

  profil: (): Promise<Utilisateur> => appelApi("/auth/profil"),

  deconnexion: (): Promise<void> => appelApi("/auth/deconnexion", { methode: "POST" }),
};
