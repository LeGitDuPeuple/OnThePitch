import { appelApi } from "./api";
import type { Motif, SignalementDetail, StatistiquesAdmin, EvenementAdmin, FiltresEvenementsAdmin } from "../types/moderation";

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

  // Vue d'ensemble (chiffres clés) — voir CLAUDE.md, section Modération.
  obtenirStatistiques: (): Promise<StatistiquesAdmin> => appelApi("/moderation/statistiques"),

  // Tous les événements, filtrables — pas juste ceux signalés.
  listerEvenements: (filtres: FiltresEvenementsAdmin): Promise<EvenementAdmin[]> => {
    const params = new URLSearchParams();
    if (filtres.statut) params.set("statut", filtres.statut);
    if (filtres.dateDebutMin) params.set("dateDebutMin", filtres.dateDebutMin);
    if (filtres.dateDebutMax) params.set("dateDebutMax", filtres.dateDebutMax);
    const suffixe = params.toString() ? `?${params.toString()}` : "";
    return appelApi(`/moderation/evenements${suffixe}`);
  },

  // Désactive l'événement (soft delete) + avertit l'organisateur.
  sanctionner: (idEvenement: number): Promise<void> =>
    appelApi(`/moderation/evenements/${idEvenement}/sanctionner`, { methode: "POST" }),

  // Faux signalement : l'événement reste actif, les signalements sont retirés.
  rejeter: (idEvenement: number): Promise<void> =>
    appelApi(`/moderation/evenements/${idEvenement}/signalements`, { methode: "DELETE" }),
};
