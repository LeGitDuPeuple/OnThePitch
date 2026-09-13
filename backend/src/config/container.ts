// Repositories
import { UtilisateurRepositoryDatabase } from "../repositories/utilisateurRepositoryDatabase";
import { EvenementRepositoryDatabase } from "../repositories/evenementRepositoryDatabase";
import { InscriptionRepositoryDatabase } from "../repositories/inscriptionRepositoryDatabase";
import { SignalementRepositoryDatabase } from "../repositories/signalementRepositoryDatabase";
import { LieuRepositoryDatabase } from "../repositories/lieuRepositoryDatabase";
// Services
import { AuthService } from "../services/authService";
import { EvenementService } from "../services/evenementService";
import { RechercheEvenementService } from "../services/rechercheEvenementService";
import { GeocodageService } from "../services/geocodageService";
import { InscriptionService } from "../services/inscriptionService";
import { PresenceService } from "../services/presenceService";
import { ModerationService } from "../services/moderationService";
import { PhotoService } from "../services/photoService";
// Controllers
import { AuthController } from "../controllers/authController";
import { EvenementController } from "../controllers/evenementController";
import { GeocodageController } from "../controllers/geocodageController";
import { InscriptionController } from "../controllers/inscriptionController";
import { PresenceController } from "../controllers/presenceController";
import { ModerationController } from "../controllers/moderationController";
import { PhotoController } from "../controllers/photoController";

// Point de composition unique : c'est le seul endroit du projet où un
// repository est instancié avec `new`. Le reste du code ne connaît que
// les interfaces (voir CLAUDE.md, section "Injection de dépendances").

const utilisateurRepository = new UtilisateurRepositoryDatabase();
const evenementRepository = new EvenementRepositoryDatabase();
const inscriptionRepository = new InscriptionRepositoryDatabase();
const signalementRepository = new SignalementRepositoryDatabase();
const lieuRepository = new LieuRepositoryDatabase();

const authService = new AuthService(utilisateurRepository);
const geocodageService = new GeocodageService();
const evenementService = new EvenementService(evenementRepository, geocodageService);
const rechercheEvenementService = new RechercheEvenementService(evenementRepository);
const inscriptionService = new InscriptionService(inscriptionRepository, evenementRepository);
const presenceService = new PresenceService(inscriptionRepository, evenementRepository);
const moderationService = new ModerationService(signalementRepository, evenementRepository, utilisateurRepository);
const photoService = new PhotoService(lieuRepository, evenementRepository);

export const authController = new AuthController(authService);
export const evenementController = new EvenementController(evenementService, rechercheEvenementService);
export const geocodageController = new GeocodageController(geocodageService);
export const inscriptionController = new InscriptionController(inscriptionService);
export const presenceController = new PresenceController(presenceService);
export const moderationController = new ModerationController(moderationService);
export const photoController = new PhotoController(photoService);
