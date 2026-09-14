// Validation côté client — un premier retour immédiat, avant l'aller-retour
// serveur. Le back reste la source de vérité (schémas Zod, voir
// backend/src/schemas/authSchema.ts) : ces règles sont volontairement au moins
// aussi strictes, jamais plus permissives, pour qu'une saisie acceptée ici le
// soit toujours côté serveur.

// Format email standard (local@domaine.tld) — pas de RFC 5322 complet,
// suffisant pour attraper une faute de frappe avant l'envoi.
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Le back n'exige qu'une longueur minimale de 8 (authSchema.ts) : cette règle,
// plus stricte, ne s'applique qu'à la création d'un mot de passe (inscription),
// jamais à la connexion — un compte existant peut avoir un mot de passe qui ne
// la respecte pas.
const REGEX_MOT_DE_PASSE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const validerEmail = (valeur: string): string | null => {
  if (!REGEX_EMAIL.test(valeur)) return "Adresse email invalide (format attendu : nom@domaine.fr)";
  return null;
};

export const validerMotDePasse = (valeur: string): string | null => {
  if (!REGEX_MOT_DE_PASSE.test(valeur)) {
    return "8 caractères minimum, avec au moins une majuscule, une minuscule et un chiffre";
  }
  return null;
};
