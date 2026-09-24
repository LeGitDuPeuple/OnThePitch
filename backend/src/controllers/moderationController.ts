import { Request, Response, NextFunction } from "express";
import { ModerationService } from "../services/moderationService";
import { signalementSchema, filtresEvenementsAdminSchema } from "../schemas/signalementSchema";
import { RequeteInvalide } from "../domain/erreurMetier";

export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  // GET /moderation/motifs — motifs disponibles pour signaler un événement
  // (public, comme la liste des événements : aucune donnée sensible, sert
  // juste à peupler le formulaire de signalement côté front)
  listerMotifs = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const motifs = await this.moderationService.listerMotifs();
      res.json(motifs);
    } catch (erreur) {
      next(erreur);
    }
  };

  // POST /evenements/:id/signalements — un joueur signale un événement
  signaler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idEvenement = this.extraireId(req, "id");
      const { idMotif, texteLibre } = signalementSchema.parse(req.body);

      const signalement = await this.moderationService.signaler(
        idEvenement,
        req.utilisateur!.id,
        idMotif,
        texteLibre
      );

      res.status(201).json(signalement.versReponse());
    } catch (erreur) {
      next(erreur);
    }
  };

  // GET /moderation/signalements — liste des signalements à traiter (admin)
  lister = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signalements = await this.moderationService.listerSignalementsEnAttente();

      res.json(
        signalements.map(({ signalement, motifLibelle, evenementTitre }) => ({
          ...signalement.versReponse(),
          motifLibelle,
          evenementTitre,
        }))
      );
    } catch (erreur) {
      next(erreur);
    }
  };

  // GET /moderation/statistiques — vue d'ensemble du tableau de bord admin
  statistiques = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const statistiques = await this.moderationService.obtenirStatistiques();
      res.json(statistiques);
    } catch (erreur) {
      next(erreur);
    }
  };

  // GET /moderation/evenements — vue d'ensemble admin, tous les événements,
  // filtrable par statut et par plage de date de début
  listerEvenements = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filtres = filtresEvenementsAdminSchema.parse(req.query);
      const evenements = await this.moderationService.listerEvenements(filtres);

      res.json(
        evenements.map(({ evenement, organisateur }) => ({
          ...evenement.versReponse(),
          estAnnule: evenement.dateDesactivation !== null,
          organisateur,
        }))
      );
    } catch (erreur) {
      next(erreur);
    }
  };

  // POST /moderation/evenements/:id/sanctionner — désactive l'événement + avertit l'organisateur
  sanctionner = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idEvenement = this.extraireId(req, "id");
      await this.moderationService.sanctionner(idEvenement);

      res.status(204).send();
    } catch (erreur) {
      next(erreur);
    }
  };

  // DELETE /moderation/evenements/:id/signalements — faux signalement, l'événement reste actif
  rejeter = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idEvenement = this.extraireId(req, "id");
      await this.moderationService.rejeterSignalements(idEvenement);

      res.status(204).send();
    } catch (erreur) {
      next(erreur);
    }
  };

  private extraireId(req: Request, param: string): number {
    const id = Number(req.params[param]);

    if (!Number.isInteger(id)) {
      throw new RequeteInvalide("Identifiant invalide");
    }

    return id;
  }
}
