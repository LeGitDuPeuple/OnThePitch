import { z } from "zod";

// Validation du corps de POST /evenements/:id/signalements
export const signalementSchema = z.object({
  idMotif: z.number().int().positive(),
  texteLibre: z.string().max(255).optional(),
});

export type DonneesSignalement = z.infer<typeof signalementSchema>;

// Validation des paramètres de GET /moderation/evenements (query string, donc
// coercition) — vue d'ensemble admin, voir CLAUDE.md section Modération.
export const filtresEvenementsAdminSchema = z.object({
  statut: z.enum(["Ouvert", "Complet", "Termine", "Annule"]).optional(),
  dateDebutMin: z.coerce.date().optional(),
  dateDebutMax: z.coerce.date().optional(),
});

export type FiltresEvenementsAdminQuery = z.infer<typeof filtresEvenementsAdminSchema>;
