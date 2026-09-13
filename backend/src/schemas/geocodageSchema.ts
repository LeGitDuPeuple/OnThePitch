import { z } from "zod";

// Validation des paramètres de GET /evenements/geocoder
export const geocodageQuerySchema = z.object({
  adresse: z.string().min(5),
});

export type GeocodageQuery = z.infer<typeof geocodageQuerySchema>;
