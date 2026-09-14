import { appelApi } from "./api";

export const presenceService = {
  // Jeton court (JWT), valable le jour de l'événement seulement — encodé en QR
  // côté front (qrcode.react), jamais affiché en clair (voir CLAUDE.md section 7).
  genererJeton: (idEvenement: number): Promise<{ jeton: string }> =>
    appelApi(`/evenements/${idEvenement}/presences/jeton`),
};
