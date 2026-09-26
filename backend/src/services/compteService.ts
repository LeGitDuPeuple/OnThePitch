import bcrypt from "bcrypt";
import { Utilisateur } from "../domain/entities/Utilisateur";
import { UtilisateurRepositoryInterface } from "../domain/interface/utilisateurRepositoryInterface";
import { EvenementRepositoryInterface } from "../domain/interface/evenementRepositoryInterface";
import { InscriptionRepositoryInterface } from "../domain/interface/inscriptionRepositoryInterface";
import { AccesRefuse, Conflit, RequeteInvalide, RessourceIntrouvable } from "../domain/erreurMetier";
import { EvenementService } from "./evenementService";
import { DoubleAuthService } from "./doubleAuthService";

const COUT_BCRYPT = 12;

// Gestion du compte par son propriétaire (email, mot de passe, suppression).
// Séparé de AuthService (inscription, connexion) : une raison de changer différente.
export class CompteService {
  constructor(
    private readonly utilisateurRepository: UtilisateurRepositoryInterface,
    private readonly evenementRepository: EvenementRepositoryInterface,
    private readonly inscriptionRepository: InscriptionRepositoryInterface,
    private readonly evenementService: EvenementService,
    private readonly doubleAuthService: DoubleAuthService
  ) {}

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

  // Droit à l'effacement (RGPD). Un simple soft delete ne suffirait pas : la
  // ligne garderait nom, email et ville. Le compte est donc anonymisé (la ligne
  // reste, les événements passés et les évaluations qui s'y rattachent aussi).
  // Avant cela, on rend ce qui est à venir cohérent :
  // - ses événements à venir sont annulés (les inscrits acceptés sont
  //   prévenus, comme pour n'importe quelle annulation) — personne ne les
  //   organiserait plus ;
  // - ses inscriptions à des événements à venir sont retirées (place libérée).
  // Confirmé par le mot de passe, et par un code si la 2FA est active. Un
  // administrateur ne peut pas supprimer son compte ici (on ne se retrouve pas
  // sans modérateur par mégarde).
  async supprimerCompte(idUtilisateur: number, motDePasse: string, codeDoubleAuth?: string): Promise<void> {
    const utilisateur = await this.trouverEtVerifierMotDePasse(idUtilisateur, motDePasse);

    if (utilisateur.estAdministrateur()) {
      throw new AccesRefuse("Un compte administrateur ne peut pas être supprimé depuis l'application");
    }

    await this.doubleAuthService.exigerCodeSiActive(utilisateur, codeDoubleAuth);

    const maintenant = new Date();

    const organises = await this.evenementRepository.listerParOrganisateur(idUtilisateur);
    for (const evenement of organises.filter((e) => e.dateDebut > maintenant && e.statut !== "Termine")) {
      await this.evenementService.annuler(evenement.id, idUtilisateur, utilisateur.role);
    }

    const inscriptions = await this.inscriptionRepository.listerParJoueur(idUtilisateur, [
      "en_attente",
      "acceptee",
      "refusee",
    ]);
    for (const inscription of inscriptions) {
      const evenement = await this.evenementRepository.trouverParId(inscription.idEvenement);
      if (evenement && evenement.estActif() && evenement.dateDebut > maintenant) {
        await this.inscriptionRepository.desinscrire(idUtilisateur, inscription.idEvenement);
      }
    }

    await this.utilisateurRepository.anonymiser(idUtilisateur);
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
