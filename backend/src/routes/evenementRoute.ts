import { Router } from "express";
import { EvenementController } from "../controllers/evenementController";
import { GeocodageController } from "../controllers/geocodageController";
import { authentifier } from "../middlewares/authentification";
import { verifierRole } from "../middlewares/autorisation";

export const evenementRoutes = Router();

// Branche les endpoints sur le controller instancié au démarrage.
export const registerEvenementRoutes = (controller: EvenementController, geocodageController: GeocodageController) => {
  // Déclarées avant "/:id" : sinon Express interprète ces segments comme un identifiant.
  evenementRoutes.get("/recherche", controller.rechercher);
  evenementRoutes.get("/geocoder", geocodageController.geocoder);
  evenementRoutes.get("/geocoder/suggestions", geocodageController.suggerer);

  evenementRoutes.post("/", authentifier, verifierRole("joueur"), controller.creer);
  evenementRoutes.get("/:id", controller.trouverParId);
  evenementRoutes.patch("/:id", authentifier, verifierRole("joueur"), controller.modifier);
  evenementRoutes.delete("/:id", authentifier, verifierRole("joueur", "administrateur"), controller.annuler);
  evenementRoutes.post("/:id/terminer", authentifier, verifierRole("joueur"), controller.terminer);
};
