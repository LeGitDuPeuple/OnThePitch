import jwt from "jsonwebtoken";
import { Utilisateur } from "../domain/entities/Utilisateur";
import { NonAuthentifie } from "../domain/erreurMetier";
import { getEnvVariable } from "../config/utility/utils";

// Alignée sur la durée du cookie (voir config/cookie.ts).
const DUREE_SESSION = "24h";

// Court : ce jeton ne prouve que « le mot de passe a été validé », il ne
// donne accès à rien tant que le code de double authentification n'a pas suivi.
const DUREE_TEMPORAIRE = "5m";

const TYPE_TEMPORAIRE = "2fa";

// Jeton de session (cookie httpOnly) : identifiant et rôle.
export const genererJetonSession = (utilisateur: Utilisateur): string =>
  jwt.sign({ id: utilisateur.id, role: utilisateur.role }, getEnvVariable("JWT_SECRET"), {
    expiresIn: DUREE_SESSION,
  });

// Jeton intermédiaire entre le mot de passe et le code de double
// authentification. Signé avec le même secret que les sessions : le champ
// "type" le distingue, et le middleware authentifier refuse tout jeton typé
// (sinon il pourrait être posé dans le cookie et servir de session).
export const genererJetonTemporaire = (idUtilisateur: number): string =>
  jwt.sign({ id: idUtilisateur, type: TYPE_TEMPORAIRE }, getEnvVariable("JWT_SECRET"), {
    expiresIn: DUREE_TEMPORAIRE,
  });

export const lireJetonTemporaire = (jeton: string): number => {
  try {
    const contenu = jwt.verify(jeton, getEnvVariable("JWT_SECRET"));
    if (typeof contenu === "object" && contenu !== null && contenu["type"] === TYPE_TEMPORAIRE) {
      const id: unknown = contenu["id"];
      if (typeof id === "number") return id;
    }
  } catch {
    // jeton expiré ou mal signé : même réponse que ci-dessous
  }
  throw new NonAuthentifie("Connexion expirée, recommencez");
};
