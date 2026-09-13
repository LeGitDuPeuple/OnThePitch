import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getEnvVariable } from "../config/utility/utils";
import { NOM_COOKIE_JETON } from "../config/cookie";
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

// Vérifie le jeton (cookie httpOnly, jamais un en-tête) et attache l'utilisateur à la requête.
export const authentifier = (req: Request, res: Response, next: NextFunction) => {
  try {
    const jeton: unknown = req.cookies?.[NOM_COOKIE_JETON];

    if (typeof jeton !== "string") {
      throw new NonAuthentifie("Authentification requise");
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
