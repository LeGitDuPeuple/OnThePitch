// Repositories
import { UtilisateurRepositoryDatabase } from "../repositories/utilisateurRepositoryDatabase";
import { EvenementRepositoryDatabase } from "../repositories/evenementRepositoryDatabase";
import { InscriptionRepositoryDatabase } from "../repositories/inscriptionRepositoryDatabase";
import { SignalementRepositoryDatabase } from "../repositories/signalementRepositoryDatabase";
import { EvaluationRepositoryDatabase } from "../repositories/evaluationRepositoryDatabase";
import { LieuRepositoryDatabase } from "../repositories/lieuRepositoryDatabase";
import { NotificationRepositoryDatabase } from "../repositories/notificationRepositoryDatabase";
import { NotificationEmailNodemailer } from "../repositories/notificationEmailNodemailer";
// Services
import { AuthService } from "../services/authService";
import { EvenementService } from "../services/evenementService";
import { RechercheEvenementService } from "../services/rechercheEvenementService";
import { GeocodageService } from "../services/geocodageService";
import { InscriptionService } from "../services/inscriptionService";
import { PresenceService } from "../services/presenceService";
import { ModerationService } from "../services/moderationService";
import { EvaluationService } from "../services/evaluationService";
import { PhotoService } from "../services/photoService";
import { NotificationService } from "../services/notificationService";
import { CompteService } from "../services/compteService";
// Controllers
import { AuthController } from "../controllers/authController";
import { EvenementController } from "../controllers/evenementController";
import { GeocodageController } from "../controllers/geocodageController";
import { InscriptionController } from "../controllers/inscriptionController";
import { PresenceController } from "../controllers/presenceController";
import { ModerationController } from "../controllers/moderationController";
import { EvaluationController } from "../controllers/evaluationController";
import { PhotoController } from "../controllers/photoController";
import { NotificationController } from "../controllers/notificationController";
import { CompteController } from "../controllers/compteController";

// Point de composition unique : c'est le seul endroit du projet où un
// repository est instancié avec `new`. Le reste du code ne connaît que
// les interfaces (voir CLAUDE.md, section "Injection de dépendances").

const utilisateurRepository = new UtilisateurRepositoryDatabase();
const evenementRepository = new EvenementRepositoryDatabase();
const inscriptionRepository = new InscriptionRepositoryDatabase();
const signalementRepository = new SignalementRepositoryDatabase();
const evaluationRepository = new EvaluationRepositoryDatabase();
const lieuRepository = new LieuRepositoryDatabase();
const notificationRepository = new NotificationRepositoryDatabase();
const notificationEmail = new NotificationEmailNodemailer();

const authService = new AuthService(utilisateurRepository);
const compteService = new CompteService(utilisateurRepository);
const geocodageService = new GeocodageService();
const notificationService = new NotificationService(notificationRepository, notificationEmail, utilisateurRepository);
const evenementService = new EvenementService(
  evenementRepository,
  geocodageService,
  inscriptionRepository,
  notificationService,
  evaluationRepository
);
const rechercheEvenementService = new RechercheEvenementService(evenementRepository);
const inscriptionService = new InscriptionService(inscriptionRepository, evenementRepository, notificationService);
const presenceService = new PresenceService(inscriptionRepository, evenementRepository);
const moderationService = new ModerationService(signalementRepository, evenementRepository, utilisateurRepository);
const evaluationService = new EvaluationService(evaluationRepository, evenementRepository, inscriptionRepository);
const photoService = new PhotoService(lieuRepository, evenementRepository);

// Exporté en plus des controllers : server.ts en a besoin directement pour la
// clôture automatique périodique des événements oubliés (pas de route HTTP).
export { evenementService };

export const authController = new AuthController(authService);
export const compteController = new CompteController(compteService);
export const evenementController = new EvenementController(evenementService, rechercheEvenementService);
export const geocodageController = new GeocodageController(geocodageService);
export const inscriptionController = new InscriptionController(inscriptionService);
export const presenceController = new PresenceController(presenceService);
export const moderationController = new ModerationController(moderationService);
export const evaluationController = new EvaluationController(evaluationService);
export const photoController = new PhotoController(photoService);
export const notificationController = new NotificationController(notificationService);
