import { Request, Response, NextFunction } from "express";
import { EvenementService } from "../services/evenementService";
import { RechercheEvenementService } from "../services/rechercheEvenementService";
import { creationEvenementSchema, modificationEvenementSchema, rechercheEvenementSchema } from "../schemas/evenementSchema";
import { RequeteInvalide } from "../domain/erreurMetier";

export class EvenementController {
  constructor(
    private readonly evenementService: EvenementService,
    private readonly rechercheEvenementService: RechercheEvenementService
  ) {}

  // POST /evenements — réservé aux joueurs connectés
  creer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const donnees = creationEvenementSchema.parse(req.body);
      const evenement = await this.evenementService.creer(donnees, req.utilisateur!.id);

      res.status(201).json(evenement.versReponse());
    } catch (erreur) {
      next(erreur);
    }
  };

  // GET /evenements/recherche — accessible sans authentification
  rechercher = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parametres = rechercheEvenementSchema.parse(req.query);
      const resultats = await this.rechercheEvenementService.rechercherAProximite(parametres);

      res.json(resultats);
    } catch (erreur) {
      next(erreur);
    }
  };

  // GET /evenements/:id — accessible sans authentification. Inclut le lieu
  // (adresse, coordonnées) pour la fiche événement.
  trouverParId = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = this.extraireId(req);
      const { evenement, lieu } = await this.evenementService.trouverDetailParId(id);

      res.json({ ...evenement.versReponse(), lieu });
    } catch (erreur) {
      next(erreur);
    }
  };

  // PATCH /evenements/:id — modification partielle, réservée à l'organisateur
  modifier = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = this.extraireId(req);
      const donnees = modificationEvenementSchema.parse(req.body);
      const evenement = await this.evenementService.modifier(id, donnees, req.utilisateur!.id);

      res.json(evenement.versReponse());
    } catch (erreur) {
      next(erreur);
    }
  };

  // DELETE /evenements/:id — annulation par l'organisateur (soft delete)
  annuler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = this.extraireId(req);
      await this.evenementService.annuler(id, req.utilisateur!.id, req.utilisateur!.role);

      res.status(204).send();
    } catch (erreur) {
      next(erreur);
    }
  };

  // POST /evenements/:id/terminer — clôture par l'organisateur, une fois les présences relevées
  terminer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = this.extraireId(req);
      await this.evenementService.terminer(id, req.utilisateur!.id);

      res.status(204).send();
    } catch (erreur) {
      next(erreur);
    }
  };

  private extraireId(req: Request): number {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      throw new RequeteInvalide("Identifiant d'événement invalide");
    }

    return id;
  }
}
