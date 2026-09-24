import { z } from "zod";

// Validation du corps de PATCH /compte/email — le mot de passe actuel confirme
// l'identité : l'email est l'identifiant de connexion, le changer sur une
// session laissée ouverte suffirait sinon à détourner le compte.
export const changementEmailSchema = z.object({
  email: z.email().max(50),
  motDePasse: z.string().min(1, "Le mot de passe est obligatoire"),
});

// Validation du corps de PATCH /compte/mot-de-passe
export const changementMotDePasseSchema = z.object({
  motDePasseActuel: z.string().min(1, "Le mot de passe actuel est obligatoire"),
  nouveauMotDePasse: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères"),
});

export type DonneesChangementEmail = z.infer<typeof changementEmailSchema>;
export type DonneesChangementMotDePasse = z.infer<typeof changementMotDePasseSchema>;
