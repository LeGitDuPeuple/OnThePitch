import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { extractToken, getEnvVariable } from "../config/utility/utils";
import { NonAuthentifie } from "../domain/erreurMetier";
import { Role } from "../domain/entities/Utilisateur";

// Contenu du jeton, tel qu'on l'a signé dans AuthService.
export type JetonPayload = {
  id: number;
  role: Role;
};

// Ajoute la propriété "utilisateur" au type Request d'Express.
declare module "express-serve-static-core" {
  interface Request {
    utilisateur?: JetonPayload;
  }
}

// Vérifie le jeton et attache l'utilisateur à la requête.
export const authentifier = (req: Request, res: Response, next: NextFunction) => {
  try {
    const entete = req.headers.authorization;

    if (!entete) {
      throw new NonAuthentifie("Authentification requise");
    }

    const jeton = extractToken(entete);

    if (!jeton) {
      throw new NonAuthentifie("Format d'authentification invalide");
    }

    req.utilisateur = jwt.verify(jeton, getEnvVariable("JWT_SECRET")) as JetonPayload;

    next();
  } catch (erreur) {
    // Un jeton expiré ou mal signé lève une erreur jwt, qu'on traduit ici.
    if (erreur instanceof jwt.JsonWebTokenError || erreur instanceof jwt.TokenExpiredError) {
      return next(new NonAuthentifie("Jeton invalide ou expiré"));
    }
    next(erreur);
  }
};