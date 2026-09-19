import { appelApi } from "./api";
import type { Motif, SignalementDetail } from "../types/moderation";

export const moderationService = {
  // Public — sert juste à peupler le formulaire de signalement (voir
  // moderationRoute.ts côté back).
  listerMotifs: (): Promise<Motif[]> => appelApi("/moderation/motifs"),

  // Un joueur signale un événement (réservé aux comptes joueur, revérifié
  // côté back).
  signaler: (idEvenement: number, idMotif: number, texteLibre?: string): Promise<void> =>
    appelApi(`/evenements/${idEvenement}/signalements`, { methode: "POST", corps: { idMotif, texteLibre } }),

  // Le reste est réservé à un administrateur — le serveur revérifie le rôle à
  // chaque appel (verifierRole côté back, la garde de route ici n'est qu'un
  // confort d'usage, voir CLAUDE.md section 9).
  listerSignalements: (): Promise<SignalementDetail[]> => appelApi("/moderation/signalements"),

  // Désactive l'événement (soft delete) + avertit l'organisateur.
  sanctionner: (idEvenement: number): Promise<void> =>
    appelApi(`/moderation/evenements/${idEvenement}/sanctionner`, { methode: "POST" }),

  // Faux signalement : l'événement reste actif, les signalements sont retirés.
  rejeter: (idEvenement: number): Promise<void> =>
    appelApi(`/moderation/evenements/${idEvenement}/signalements`, { methode: "DELETE" }),
};
