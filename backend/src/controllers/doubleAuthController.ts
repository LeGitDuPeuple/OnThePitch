import { Request, Response, NextFunction } from "express";
import { DoubleAuthService } from "../services/doubleAuthService";
import { codeDoubleAuthSchema, connexionDoubleAuthSchema } from "../schemas/doubleAuthSchema";
import { poserCookieJeton } from "../config/cookie";

export class DoubleAuthController {
  constructor(private readonly doubleAuthService: DoubleAuthService) {}

  // POST /compte/2fa/initialiser — secret et adresse otpauth:// pour le QR code
  initialiser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await this.doubleAuthService.initialiser(req.utilisateur!.id));
    } catch (erreur) {
      next(erreur);
    }
  };

  // POST /compte/2fa/activer — renvoie les codes de secours, affichés une seule fois
  activer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = codeDoubleAuthSchema.parse(req.body);
      const codesSecours = await this.doubleAuthService.activer(req.utilisateur!.id, code);

      res.json({ codesSecours });
    } catch (erreur) {
      next(erreur);
    }
  };

  // POST /compte/2fa/desactiver
  desactiver = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = codeDoubleAuthSchema.parse(req.body);
      await this.doubleAuthService.desactiver(req.utilisateur!.id, code);

      res.status(204).send();
    } catch (erreur) {
      next(erreur);
    }
  };

  // POST /auth/connexion/2fa — seconde étape de la connexion : ouvre la session
  connexion = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jetonTemporaire, code } = connexionDoubleAuthSchema.parse(req.body);
      const { jeton, utilisateur } = await this.doubleAuthService.terminerConnexion(jetonTemporaire, code);

      poserCookieJeton(res, jeton);
      res.json({ utilisateur: utilisateur.versReponse() });
    } catch (erreur) {
      next(erreur);
    }
  };
}
