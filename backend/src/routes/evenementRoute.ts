import { Router } from "express";
import { EvenementController } from "../controllers/evenementController";
import { authentifier } from "../middlewares/authentification";
import { verifierRole } from "../middlewares/autorisation";

export const evenementRoutes = Router();

// Branche les endpoints sur le controller instancié au démarrage.
export const registerEvenementRoutes = (controller: EvenementController) => {
  // Déclarée avant "/:id" : sinon Express interprète "recherche" comme un identifiant.
  evenementRoutes.get("/recherche", controller.rechercher);

  evenementRoutes.post("/", authentifier, verifierRole("joueur"), controller.creer);
  evenementRoutes.get("/:id", controller.trouverParId);
  evenementRoutes.delete("/:id", authentifier, verifierRole("joueur", "administrateur"), controller.annuler);
  evenementRoutes.post("/:id/terminer", authentifier, verifierRole("joueur"), controller.terminer);
};
