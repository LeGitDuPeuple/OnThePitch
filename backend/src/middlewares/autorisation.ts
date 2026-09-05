import { Request, Response, NextFunction } from "express";
import { AccesRefuse, NonAuthentifie } from "../domain/erreurMetier";
import { Role } from "../domain/entities/Utilisateur";

// Vérifie que l'utilisateur connecté possède l'un des rôles autorisés.
// À placer après le middleware authentifier.
export const verifierRole = (...rolesAutorises: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.utilisateur) {
      return next(new NonAuthentifie("Authentification requise"));
    }

    if (!rolesAutorises.includes(req.utilisateur.role)) {
      return next(new AccesRefuse("Vous n'avez pas les droits nécessaires"));
    }

    next();
  };
};