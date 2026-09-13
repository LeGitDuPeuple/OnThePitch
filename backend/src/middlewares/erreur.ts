import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { MulterError } from "multer";
import { ErreurMetier } from "../domain/erreurMetier";

/**
 * Gestionnaire d'erreurs centralisé.
 * Monté en dernier dans la pile Express, il reçoit tout ce que
 * les controllers laissent remonter via next(erreur).
 */
export const errorHandlerMiddleware = (
  erreur: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (erreur instanceof ErreurMetier) {
    return res.status(erreur.statut).json({ message: erreur.message });
  }

  // Fichier trop volumineux, champ inattendu, etc. — voir routes/photoRoute.ts.
  if (erreur instanceof MulterError) {
    return res.status(400).json({ message: `Fichier invalide : ${erreur.message}` });
  }

  if (erreur instanceof ZodError) {
    return res.status(400).json({
      message: "Données invalides",
      details: erreur.issues.map((probleme) => ({
        champ: probleme.path.join("."),
        message: probleme.message,
      })),
    });
  }

  console.error(erreur);
  return res.status(500).json({ message: "Erreur interne du serveur" });
};