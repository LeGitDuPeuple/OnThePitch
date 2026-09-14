import { appelApi } from "./api";
import type { SignalementDetail } from "../types/moderation";

// Réservé à un administrateur — le serveur revérifie le rôle à chaque appel
// (verifierRole côté back, la garde de route ici n'est qu'un confort d'usage,
// voir CLAUDE.md section 9).
export const moderationService = {
  listerSignalements: (): Promise<SignalementDetail[]> => appelApi("/moderation/signalements"),

  // Désactive l'événement (soft delete) + avertit l'organisateur.
  sanctionner: (idEvenement: number): Promise<void> =>
    appelApi(`/moderation/evenements/${idEvenement}/sanctionner`, { methode: "POST" }),

  // Faux signalement : l'événement reste actif, les signalements sont retirés.
  rejeter: (idEvenement: number): Promise<void> =>
    appelApi(`/moderation/evenements/${idEvenement}/signalements`, { methode: "DELETE" }),
};
