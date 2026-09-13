import { Router } from "express";
import multer from "multer";
import { PhotoController } from "../controllers/photoController";
import { authentifier } from "../middlewares/authentification";
import { verifierRole } from "../middlewares/autorisation";
import { RequeteInvalide } from "../domain/erreurMetier";

const TAILLE_MAX_OCTETS = 2 * 1024 * 1024; // 2 Mo
const TYPES_AUTORISES = ["image/jpeg", "image/png", "image/webp"];

// Stockage en mémoire, jamais sur disque : l'API reste sans état (mise à l'échelle
// horizontale sous Kubernetes, voir CLAUDE.md section "Express et REST"). Le fichier
// est écrit tel quel en base (lieu.photo) par PhotoService, pas sur le système de fichiers.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAILLE_MAX_OCTETS },
  fileFilter: (_req, fichier, callback) => {
    if (!TYPES_AUTORISES.includes(fichier.mimetype)) {
      callback(new RequeteInvalide("Format d'image non supporté (jpeg, png, webp uniquement)"));
      return;
    }
    callback(null, true);
  },
});

export const registerPhotoRoutes = (router: Router, controller: PhotoController) => {
  router.post("/:id/photo", authentifier, verifierRole("joueur"), upload.single("photo"), controller.televerser);
  router.get("/:id/photo", controller.recuperer);
};
