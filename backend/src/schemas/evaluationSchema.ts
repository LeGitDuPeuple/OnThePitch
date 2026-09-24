import { z } from "zod";

// Validation du corps de POST /evenements/:id/evaluations
export const evaluationSchema = z.object({
  note: z.number().int().min(1).max(5),
  commentaire: z.string().max(255).optional(),
});

export type DonneesEvaluation = z.infer<typeof evaluationSchema>;
