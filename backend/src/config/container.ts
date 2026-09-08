// Repositories
import { UtilisateurRepositoryDatabase } from "../repositories/utilisateurRepositoryDatabase";
import { EvenementRepositoryDatabase } from "../repositories/evenementRepositoryDatabase";
// Services
import { AuthService } from "../services/authService";
import { EvenementService } from "../services/evenementService";
import { RechercheEvenementService } from "../services/rechercheEvenementService";
import { GeocodageService } from "../services/geocodageService";
// Controllers
import { AuthController } from "../controllers/authController";
import { EvenementController } from "../controllers/evenementController";

// Point de composition unique : c'est le seul endroit du projet où un
// repository est instancié avec `new`. Le reste du code ne connaît que
// les interfaces (voir CLAUDE.md, section "Injection de dépendances").

const utilisateurRepository = new UtilisateurRepositoryDatabase();
const evenementRepository = new EvenementRepositoryDatabase();

const authService = new AuthService(utilisateurRepository);
const geocodageService = new GeocodageService();
const evenementService = new EvenementService(evenementRepository, geocodageService);
const rechercheEvenementService = new RechercheEvenementService(evenementRepository);

export const authController = new AuthController(authService);
export const evenementController = new EvenementController(evenementService, rechercheEvenementService);
