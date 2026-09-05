import { z } from "zod";

// Validation du corps de POST /auth/inscription
export const inscriptionSchema = z.object({
  nom: z.string().min(2).max(50),
  prenom: z.string().min(2).max(50),
  email: z.email().max(50),
  motDePasse: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères"),
  ville: z.string().max(50).optional(),
});

// Validation du corps de POST /auth/connexion
export const connexionSchema = z.object({
  email: z.email(),
  motDePasse: z.string().min(1, "Le mot de passe est obligatoire"),
});

// Types déduits des schémas : une seule source de vérité.
export type DonneesInscription = z.infer<typeof inscriptionSchema>;
export type DonneesConnexion = z.infer<typeof connexionSchema>;