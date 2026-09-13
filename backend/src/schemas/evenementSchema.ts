import { z } from "zod";

// Correspond aux libellés de la table de référence niveau_event.
const niveauRequisSchema = z.enum(["debutant", "intermediaire", "confirme", "tous_niveaux"]);

// Validation du corps de POST /evenements
export const creationEvenementSchema = z.object({
  titre: z.string().min(3).max(50),
  description: z.string().max(1000).optional(),
  adresse: z.string().min(5),
  nomLieu: z.string().max(100).optional(),
  dateDebut: z.coerce.date(),
  dateFin: z.coerce.date(),
  nombrePlaces: z.number().int().min(2).max(30),
  estPrive: z.boolean(),
  typeTerrain: z.string().max(50).optional(),
  niveauRequis: niveauRequisSchema.default("tous_niveaux"),
});

// Validation du corps de PATCH /evenements/:id — tous les champs sont facultatifs
// (modification partielle), sauf qu'au moins un doit être présent. L'adresse n'est
// pas modifiable ici : elle redéclencherait un géocodage et changerait le lieu
// utilisé par la recherche géolocalisée, hors périmètre de cette fonctionnalité.
export const modificationEvenementSchema = z
  .object({
    titre: z.string().min(3).max(50).optional(),
    description: z.string().max(1000).optional(),
    dateDebut: z.coerce.date().optional(),
    dateFin: z.coerce.date().optional(),
    nombrePlaces: z.number().int().min(2).max(30).optional(),
    niveauRequis: niveauRequisSchema.optional(),
  })
  .refine((donnees) => Object.keys(donnees).length > 0, {
    message: "Au moins un champ doit être fourni",
  });

// Validation des paramètres de GET /evenements/recherche (query string, donc coercition).
export const rechercheEvenementSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  rayonKm: z.coerce.number().positive().optional(),
});

// Types déduits des schémas : une seule source de vérité.
export type CreationEvenement = z.infer<typeof creationEvenementSchema>;
export type ModificationEvenement = z.infer<typeof modificationEvenementSchema>;
export type RechercheEvenementQuery = z.infer<typeof rechercheEvenementSchema>;
