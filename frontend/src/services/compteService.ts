import { appelApi } from "./api";
import type { Utilisateur } from "../store/authSlice";

export const compteService = {
  // Renvoie l'utilisateur à jour : le front remplace son état d'authentification.
  changerEmail: (email: string, motDePasse: string): Promise<Utilisateur> =>
    appelApi("/compte/email", { methode: "PATCH", corps: { email, motDePasse } }),

  changerMotDePasse: (motDePasseActuel: string, nouveauMotDePasse: string): Promise<void> =>
    appelApi("/compte/mot-de-passe", { methode: "PATCH", corps: { motDePasseActuel, nouveauMotDePasse } }),

  // Double authentification : secret et adresse otpauth:// à encoder en QR code.
  initialiserDoubleAuth: (): Promise<{ secret: string; uri: string }> =>
    appelApi("/compte/2fa/initialiser", { methode: "POST" }),

  // Confirme avec un premier code, renvoie les codes de secours (une seule fois).
  activerDoubleAuth: (code: string): Promise<{ codesSecours: string[] }> =>
    appelApi("/compte/2fa/activer", { methode: "POST", corps: { code } }),

  desactiverDoubleAuth: (code: string): Promise<void> =>
    appelApi("/compte/2fa/desactiver", { methode: "POST", corps: { code } }),

  // Anonymise le compte (droit à l'effacement) ; le serveur efface aussi le cookie.
  // Le code n'est exigé que si la double authentification est active.
  supprimerCompte: (motDePasse: string, code?: string): Promise<void> =>
    appelApi("/compte", { methode: "DELETE", corps: { motDePasse, code: code || undefined } }),
};
