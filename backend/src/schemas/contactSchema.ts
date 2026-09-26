import { z } from "zod";

// Corps de POST /aide/contact. Les bornes empêchent l'usage du formulaire
// comme relais de spam volumineux.
export const contactSchema = z.object({
  nom: z.string().trim().min(2, "Le nom est obligatoire").max(50),
  email: z.email().max(100),
  message: z.string().trim().min(10, "Le message doit faire au moins 10 caractères").max(2000),
});
