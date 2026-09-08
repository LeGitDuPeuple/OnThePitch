import { z } from "zod";

// Validation du corps de POST /evenements
export const creationEvenementSchema = z.object({
  titre: z.string().min(3).max(50),
  adresse: z.string().min(5),
  dateDebut: z.coerce.date(),
  dateFin: z.coerce.date(),
  nombrePlaces: z.number().int().min(2).max(30),
  estPrive: z.boolean(),
  typeTerrain: z.string().max(50).optional(),
});

// Validation des paramètres de GET /evenements/recherche (query string, donc coercition).
export const rechercheEvenementSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  rayonKm: z.coerce.number().positive().optional(),
});

// Types déduits des schémas : une seule source de vérité.
export type CreationEvenement = z.infer<typeof creationEvenementSchema>;
export type RechercheEvenementQuery = z.infer<typeof rechercheEvenementSchema>;
