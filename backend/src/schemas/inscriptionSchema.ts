import { z } from "zod";

// Validation du corps de PATCH /evenements/:id/inscriptions/:idJoueur
export const validationDemandeSchema = z.object({
  accepter: z.boolean(),
});

export type ValidationDemande = z.infer<typeof validationDemandeSchema>;
