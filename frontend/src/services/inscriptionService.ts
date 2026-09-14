import { appelApi } from "./api";
import type { InscritDetail } from "../types/evenement";

export const inscriptionService = {
  lister: (idEvenement: number): Promise<InscritDetail[]> => appelApi(`/evenements/${idEvenement}/inscriptions`),

  // Rejoindre : demande directe si l'événement est public, demande en attente sinon
  // (voir CLAUDE.md, section 6 — la distinction est faite côté serveur).
  rejoindre: (idEvenement: number): Promise<void> => appelApi(`/evenements/${idEvenement}/inscriptions`, { methode: "POST" }),

  seDesinscrire: (idEvenement: number): Promise<void> =>
    appelApi(`/evenements/${idEvenement}/inscriptions`, { methode: "DELETE" }),

  // Validation d'une demande sur un événement privé — réservée à l'organisateur.
  validerDemande: (idEvenement: number, idJoueur: number, accepter: boolean): Promise<void> =>
    appelApi(`/evenements/${idEvenement}/inscriptions/${idJoueur}`, { methode: "PATCH", corps: { accepter } }),
};
