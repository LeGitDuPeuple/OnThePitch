import bcrypt from "bcrypt";
import { Utilisateur } from "../domain/entities/Utilisateur";
import { UtilisateurRepositoryInterface } from "../domain/interface/utilisateurRepositoryInterface";
import { Conflit, NonAuthentifie, RessourceIntrouvable } from "../domain/erreurMetier";
import { DonneesInscription, DonneesConnexion } from "../schemas/authSchema";
import { genererJetonSession, genererJetonTemporaire } from "./jetons";

const COUT_BCRYPT = 12;

// Résultat d'une connexion : soit la session est ouverte, soit le compte a la
// double authentification et il reste à fournir le code (jeton temporaire).
export type ResultatConnexion =
  | { doubleAuthRequise: false; jeton: string; utilisateur: Utilisateur }
  | { doubleAuthRequise: true; jetonTemporaire: string };

export class AuthService {
  constructor(private readonly utilisateurRepository: UtilisateurRepositoryInterface) {}

  // Crée un compte : vérifie que l'email est libre, hache le mot de passe, enregistre.
  async inscrire(donnees: DonneesInscription): Promise<Utilisateur> {
    const existant = await this.utilisateurRepository.trouverParEmail(donnees.email);

    if (existant) {
      throw new Conflit("Un compte existe déjà avec cet email", "email");
    }

    const motDePasseHache = await bcrypt.hash(donnees.motDePasse, COUT_BCRYPT);

    const utilisateur = await this.utilisateurRepository.creer({
      nom: donnees.nom,
      prenom: donnees.prenom,
      email: donnees.email,
      motDePasseHache,
      ville: donnees.ville,
    });

    return utilisateur;
  }

  // Vérifie les identifiants. Sans double authentification : renvoie le jeton de
  // session. Avec : renvoie un jeton temporaire, la connexion s'achève dans
  // DoubleAuthService.terminerConnexion.
  async connecter(donnees: DonneesConnexion): Promise<ResultatConnexion> {
    const utilisateur = await this.utilisateurRepository.trouverParEmail(donnees.email);

    // Même message dans les deux cas : ne pas révéler si l'email existe.
    if (!utilisateur) {
      throw new NonAuthentifie("Email ou mot de passe incorrect");
    }

    const motDePasseValide = await bcrypt.compare(donnees.motDePasse, utilisateur.hachage);

    if (!motDePasseValide) {
      throw new NonAuthentifie("Email ou mot de passe incorrect");
    }

    if (utilisateur.doubleAuthActive) {
      return { doubleAuthRequise: true, jetonTemporaire: genererJetonTemporaire(utilisateur.id) };
    }

    await this.utilisateurRepository.majDerniereConnexion(utilisateur.id);

    return { doubleAuthRequise: false, jeton: genererJetonSession(utilisateur), utilisateur };
  }

    // Récupère le profil d'un utilisateur connecté.
  async trouverProfil(id: number): Promise<Utilisateur> {
    const utilisateur = await this.utilisateurRepository.trouverParId(id);

    if (!utilisateur) {
      throw new RessourceIntrouvable("Utilisateur introuvable");
    }

    return utilisateur;
  }

}