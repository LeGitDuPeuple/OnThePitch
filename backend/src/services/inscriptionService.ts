import { Inscription } from "../domain/entities/Inscription";
import { InscriptionRepositoryInterface, InscritDetail } from "../domain/interface/inscriptionRepositoryInterface";
import { EvenementRepositoryInterface } from "../domain/interface/evenementRepositoryInterface";
import { NotificationInterface } from "../domain/interface/notificationInterface";
import { RessourceIntrouvable, AccesRefuse, Conflit } from "../domain/erreurMetier";

export class InscriptionService {
  constructor(
    private readonly inscriptionRepository: InscriptionRepositoryInterface,
    private readonly evenementRepository: EvenementRepositoryInterface,
    private readonly notification: NotificationInterface
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
    const inscription = await this.inscriptionRepository.rejoindre(idJoueur, idEvenement, statutInitial);

    if (statutInitial === "en_attente") {
      await this.notification.notifier(evenement.idOrganisateur, "nouvelle_demande", idEvenement);
    } else {
      // Inscription directe (événement public) : peut avoir pris la dernière place.
      await this.notifierSiComplet(evenement.idOrganisateur, idEvenement);
    }

    return inscription;
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

    const inscriptionMiseAJour = accepter
      ? await this.inscriptionRepository.accepter(idJoueur, idEvenement)
      : await this.inscriptionRepository.refuser(idJoueur, idEvenement);

    await this.notification.notifier(idJoueur, accepter ? "demande_acceptee" : "demande_refusee", idEvenement);
    if (accepter) {
      await this.notifierSiComplet(idOrganisateur, idEvenement);
    }

    return inscriptionMiseAJour;
  }

  // Après une inscription/acceptation réussie, la place ne peut être passée de
  // libre à complète qu'à cet instant précis : executerAvecControleDesPlaces
  // (voir InscriptionRepositoryDatabase) refuse déjà l'opération si l'événement
  // était complet avant, donc un succès qui amène à égalité vient forcément de
  // franchir le seuil — pas besoin d'un état "avant/après" à comparer ici.
  private async notifierSiComplet(idOrganisateur: number, idEvenement: number): Promise<void> {
    const evenement = await this.evenementRepository.trouverParId(idEvenement);
    if (evenement?.estComplet()) {
      await this.notification.notifier(idOrganisateur, "evenement_complet", idEvenement);
    }
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
