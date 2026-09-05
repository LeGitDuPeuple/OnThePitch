// Repositories
import { UtilisateurRepositoryDatabase } from "../repositories/utilisateurRepositoryDatabase";
// Services
import { AuthService } from "../services/authService";
// Controllers
import { AuthController } from "../controllers/authController";

// Point de composition unique : c'est le seul endroit du projet où un
// repository est instancié avec `new`. Le reste du code ne connaît que
// les interfaces (voir CLAUDE.md, section "Injection de dépendances").

const utilisateurRepository = new UtilisateurRepositoryDatabase();

const authService = new AuthService(utilisateurRepository);

export const authController = new AuthController(authService);
