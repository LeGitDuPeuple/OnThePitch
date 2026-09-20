import { appelApi } from "./api";
import type { PresenceReponse } from "../types/evenement";

export const presenceService = {
  // Jeton court (JWT), valable le jour de l'événement seulement — encodé en QR
  // côté front (qrcode.react), jamais affiché en clair (voir CLAUDE.md section 7).
  genererJeton: (idEvenement: number): Promise<{ jeton: string }> =>
    appelApi(`/evenements/${idEvenement}/presences/jeton`),

  // Scan par l'organisateur — le serveur revérifie tout (signature, expiration,
  // bon événement, scanneur = organisateur, joueur inscrit/accepté).
  scanner: (idEvenement: number, jeton: string): Promise<PresenceReponse> =>
    appelApi(`/evenements/${idEvenement}/presences/scan`, { methode: "POST", corps: { jeton } }),

  // Marquage manuel, en secours (caméra en panne, joueur sans téléphone...).
  marquerManuellement: (idEvenement: number, idJoueur: number): Promise<PresenceReponse> =>
    appelApi(`/evenements/${idEvenement}/presences/manuel`, { methode: "POST", corps: { idJoueur } }),
};
