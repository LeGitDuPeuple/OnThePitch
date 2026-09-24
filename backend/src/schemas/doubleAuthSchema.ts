import { z } from "zod";

// Un code TOTP (6 chiffres) ou un code de secours (10 caractères, avec ou sans
// tiret) : le service tranche, le schéma borne seulement la taille.
const codeSchema = z.string().trim().min(6, "Le code est obligatoire").max(20);

// Corps de POST /compte/2fa/activer et POST /compte/2fa/desactiver
export const codeDoubleAuthSchema = z.object({
  code: codeSchema,
});

// Corps de POST /auth/connexion/2fa
export const connexionDoubleAuthSchema = z.object({
  jetonTemporaire: z.string().min(1),
  code: codeSchema,
});
