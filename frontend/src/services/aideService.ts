import { appelApi } from "./api";

export const aideService = {
  // Public : un visiteur non connecté peut écrire au support.
  envoyerContact: (demande: { nom: string; email: string; message: string }): Promise<void> =>
    appelApi("/aide/contact", { methode: "POST", corps: demande }),
};
