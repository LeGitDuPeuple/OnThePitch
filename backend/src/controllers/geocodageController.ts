import { Request, Response, NextFunction } from "express";
import { GeocodeurInterface } from "../domain/interface/geocodeurInterface";
import { geocodageQuerySchema } from "../schemas/geocodageSchema";

export class GeocodageController {
  constructor(private readonly geocodeur: GeocodeurInterface) {}

  // GET /evenements/geocoder — le front y envoie une adresse saisie manuellement.
  // Il ne doit jamais contacter l'API Adresse lui-même (voir CLAUDE.md, section 3).
  geocoder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { adresse } = geocodageQuerySchema.parse(req.query);
      const coordonnees = await this.geocodeur.geocoder(adresse);

      res.json(coordonnees);
    } catch (erreur) {
      next(erreur);
    }
  };
}
