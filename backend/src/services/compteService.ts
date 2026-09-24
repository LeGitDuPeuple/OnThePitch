import bcrypt from "bcrypt";
import { Utilisateur } from "../domain/entities/Utilisateur";
import { UtilisateurRepositoryInterface } from "../domain/interface/utilisateurRepositoryInterface";
import { Conflit, RequeteInvalide, RessourceIntrouvable } from "../domain/erreurMetier";

const COUT_BCRYPT = 12;

// Gestion du compte par son propriétaire (email, mot de passe). Séparé de
// AuthService (inscription, connexion) : une raison de changer différente.
export class CompteService {
  constructor(private readonly utilisateurRepository: UtilisateurRepositoryInterface) {}

  // Change l'email de connexion. La nouvelle adresse sert aussitôt à se
  // connecter et à recevoir les notifications : NotificationService relit
  // l'email en base à chaque envoi, rien n'est copié ailleurs.
  async changerEmail(idUtilisateur: number, nouvelEmail: string, motDePasse: string): Promise<Utilisateur> {
    const utilisateur = await this.trouverEtVerifierMotDePasse(idUtilisateur, motDePasse);

    if (nouvelEmail === utilisateur.email) {
      throw new RequeteInvalide("C'est déjà votre adresse email", "email");
    }

    const existant = await this.utilisateurRepository.trouverParEmail(nouvelEmail);
    if (existant) {
      throw new Conflit("Un compte existe déjà avec cet email", "email");
    }

    return this.utilisateurRepository.changerEmail(idUtilisateur, nouvelEmail);
  }

  async changerMotDePasse(idUtilisateur: number, motDePasseActuel: string, nouveauMotDePasse: string): Promise<void> {
    await this.trouverEtVerifierMotDePasse(idUtilisateur, motDePasseActuel, "motDePasseActuel");

    if (nouveauMotDePasse === motDePasseActuel) {
      throw new RequeteInvalide("Le nouveau mot de passe doit être différent de l'actuel", "nouveauMotDePasse");
    }

    const motDePasseHache = await bcrypt.hash(nouveauMotDePasse, COUT_BCRYPT);
    await this.utilisateurRepository.changerMotDePasse(idUtilisateur, motDePasseHache);
  }

  // 400 (et non 401) sur un mot de passe faux : la session est valide, seule la
  // confirmation échoue — un 401 pourrait faire croire au front qu'elle a expiré.
  private async trouverEtVerifierMotDePasse(
    idUtilisateur: number,
    motDePasse: string,
    champ = "motDePasse"
  ): Promise<Utilisateur> {
    const utilisateur = await this.utilisateurRepository.trouverParId(idUtilisateur);

    if (!utilisateur) {
      throw new RessourceIntrouvable("Utilisateur introuvable");
    }

    if (!(await bcrypt.compare(motDePasse, utilisateur.hachage))) {
      throw new RequeteInvalide("Mot de passe incorrect", champ);
    }

    return utilisateur;
  }
}
