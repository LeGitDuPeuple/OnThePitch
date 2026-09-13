import { Inscription } from "../domain/entities/Inscription";
import { InscriptionRepositoryInterface, InscritDetail } from "../domain/interface/inscriptionRepositoryInterface";
import { EvenementRepositoryInterface } from "../domain/interface/evenementRepositoryInterface";
import { RessourceIntrouvable, AccesRefuse, Conflit } from "../domain/erreurMetier";

export class InscriptionService {
  constructor(
    private readonly inscriptionRepository: InscriptionRepositoryInterface,
    private readonly evenementRepository: EvenementRepositoryInterface
  ) {}

  // Liste les inscrits d'un événement — pour la fiche événement (accessible sans
  // authentification, au même titre que la consultation de l'événement lui-même).
  async lister(idEvenement: number): Promise<InscritDetail[]> {
    const evenement = await this.evenementRepository.trouverParId(idEvenement);

    if (!evenement || !evenement.estActif()) {
      throw new RessourceIntrouvable("Événement introuvable");
    }

    return this.inscriptionRepository.listerParEvenement(idEvenement);
  }

  // Rejoindre un événement : demande directe si public, demande en attente si privé.
  // Diagramme d'activité du dossier : public/privé → déjà inscrit ? → places disponibles ?
  async rejoindre(idEvenement: number, idJoueur: number): Promise<Inscription> {
    const evenement = await this.evenementRepository.trouverParId(idEvenement);

    if (!evenement) {
      throw new RessourceIntrouvable("Événement introuvable");
    }

    // Annulé, déjà passé ou déjà complet : la règle vit sur l'entité, pas ici.
    evenement.verifierInscriptionPossible();

    const inscriptionExistante = await this.inscriptionRepository.trouver(idJoueur, idEvenement);
    if (inscriptionExistante) {
      throw new Conflit("Vous êtes déjà inscrit ou en attente pour cet événement");
    }

    const statutInitial = evenement.estPrive ? "en_attente" : "acceptee";
    return this.inscriptionRepository.rejoindre(idJoueur, idEvenement, statutInitial);
  }

  // Validation d'une demande sur un événement privé — réservée à l'organisateur.
  async validerDemande(
    idEvenement: number,
    idJoueur: number,
    idOrganisateur: number,
    accepter: boolean
  ): Promise<Inscription> {
    const evenement = await this.evenementRepository.trouverParId(idEvenement);

    if (!evenement) {
      throw new RessourceIntrouvable("Événement introuvable");
    }

    if (!evenement.estOrganisePar(idOrganisateur)) {
      throw new AccesRefuse("Seul l'organisateur peut valider les demandes de cet événement");
    }

    const inscription = await this.inscriptionRepository.trouver(idJoueur, idEvenement);
    if (!inscription || !inscription.estEnAttente()) {
      throw new RessourceIntrouvable("Aucune demande en attente pour ce joueur");
    }

    return accepter
      ? this.inscriptionRepository.accepter(idJoueur, idEvenement)
      : this.inscriptionRepository.refuser(idJoueur, idEvenement);
  }

  // Désinscription : le joueur retire sa propre inscription.
  async desinscrire(idEvenement: number, idJoueur: number): Promise<void> {
    const inscription = await this.inscriptionRepository.trouver(idJoueur, idEvenement);

    if (!inscription) {
      throw new RessourceIntrouvable("Vous n'êtes pas inscrit à cet événement");
    }

    await this.inscriptionRepository.desinscrire(idJoueur, idEvenement);
  }
}
