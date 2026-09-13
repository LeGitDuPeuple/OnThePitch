import { Request, Response, NextFunction } from "express";
import { PhotoService } from "../services/photoService";
import { RequeteInvalide } from "../domain/erreurMetier";

export class PhotoController {
  constructor(private readonly photoService: PhotoService) {}

  // POST /evenements/:id/photo — dépose la photo du lieu (multipart, champ "photo")
  televerser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idEvenement = this.extraireId(req);

      if (!req.file) {
        throw new RequeteInvalide("Fichier photo manquant (champ \"photo\")");
      }

      await this.photoService.televerser(idEvenement, req.utilisateur!.id, {
        donnees: req.file.buffer,
        typeMime: req.file.mimetype,
      });

      res.status(204).send();
    } catch (erreur) {
      next(erreur);
    }
  };

  // GET /evenements/:id/photo — accessible sans authentification, comme la fiche événement
  recuperer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idEvenement = this.extraireId(req);
      const photo = await this.photoService.recuperer(idEvenement);

      res.set("Content-Type", photo.typeMime);
      res.send(Buffer.from(photo.donnees));
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
