import { appelApi } from "./api";
import type { Utilisateur } from "../store/authSlice";

export const compteService = {
  // Renvoie l'utilisateur à jour : le front remplace son état d'authentification.
  changerEmail: (email: string, motDePasse: string): Promise<Utilisateur> =>
    appelApi("/compte/email", { methode: "PATCH", corps: { email, motDePasse } }),

  changerMotDePasse: (motDePasseActuel: string, nouveauMotDePasse: string): Promise<void> =>
    appelApi("/compte/mot-de-passe", { methode: "PATCH", corps: { motDePasseActuel, nouveauMotDePasse } }),
};
