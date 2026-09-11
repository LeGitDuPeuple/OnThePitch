import { z } from "zod";

// Validation du corps de POST /evenements/:id/signalements
export const signalementSchema = z.object({
  idMotif: z.number().int().positive(),
  texteLibre: z.string().max(255).optional(),
});

export type DonneesSignalement = z.infer<typeof signalementSchema>;
