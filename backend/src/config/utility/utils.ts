/**
 * Lit une variable d'environnement.
 * Lève une erreur si elle est absente, pour ne pas démarrer avec une config incomplète.
 */
export const getEnvVariable = (nom: string): string => {
  const valeur = process.env[nom];

  if (!valeur) {
    throw new Error(`Variable d'environnement manquante : ${nom}`);
  }

  return valeur;
};

/**
 * Extrait le jeton depuis l'en-tête Authorization.
 * Format attendu : "Bearer <token>"
 */
export const extractToken = (authorization: string): string | null => {
  const [prefixe, token] = authorization.split(" ");

  if (prefixe !== "Bearer" || !token) {
    return null;
  }

  return token;
};