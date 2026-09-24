import { Evenement, NiveauRequis } from "../domain/entities/Evenement";
import { Role } from "../domain/entities/Utilisateur";
import { EvenementRepositoryInterface, EvenementDetail } from "../domain/interface/evenementRepositoryInterface";
import { InscriptionRepositoryInterface } from "../domain/interface/inscriptionRepositoryInterface";
import { NotificationInterface } from "../domain/interface/notificationInterface";
import { TypeNotification } from "../domain/entities/Notification";
import { GeocodeurInterface } from "../domain/interface/geocodeurInterface";
import { EvaluationRepositoryInterface } from "../domain/interface/evaluationRepositoryInterface";
import { RessourceIntrouvable, AccesRefuse, RequeteInvalide, Conflit } from "../domain/erreurMetier";

const NIVEAU_REQUIS_DEFAUT: NiveauRequis = "tous_niveaux";

// Marge avant clôture automatique d'un événement oublié — laisse le temps de
// finir les présences tranquillement le jour même (discuté avec le porteur de
// projet le 21/09/2026, voir CLAUDE.md section Présences).
const MARGE_CLOTURE_AUTO_MS = 3 * 60 * 60 * 1000;

export type DemandeCreation = {
  titre: string;
  description?: string;
  format?: string;
  adresse: string;
  nomLieu?: string;
  nombrePlaces: number;
  estPrive: boolean;
  dateDebut: Date;
  dateFin: Date;
  typeTerrain?: string;
  niveauRequis?: NiveauRequis;
};

// Modification partielle — l'adresse n'en fait pas partie (voir schemas/evenementSchema.ts).
export type DemandeModification = {
  titre?: string;
  description?: string;
  format?: string;
  nombrePlaces?: number;
  dateDebut?: Date;
  dateFin?: Date;
  niveauRequis?: NiveauRequis;
};

export type MesEvenements = {
  organises: Evenement[];
  participe: Evenement[];
  enAttente: Evenement[];
};

export class EvenementService {
  constructor(
    private readonly evenementRepository: EvenementRepositoryInterface,
    private readonly geocodeur: GeocodeurInterface,
    private readonly inscriptionRepository: InscriptionRepositoryInterface,
    private readonly notification: NotificationInterface,
    private readonly evaluationRepository: EvaluationRepositoryInterface
  ) {}

  // Crée un événement : géocode l'adresse, puis enregistre lieu et événement.
  async creer(demande: DemandeCreation, idOrganisateur: number): Promise<Evenement> {
    // Un événement ne peut pas être créé dans le passé.
    if (demande.dateDebut <= new Date()) {
      throw new RequeteInvalide("La date de début doit être dans le futur", "dateDebut");
    }

    // Sans coordonnées, l'événement serait invisible dans toutes les recherches.
    const coordonnees = await this.geocodeur.geocoder(demande.adresse);

    return this.evenementRepository.creer({
      titre: demande.titre,
      description: demande.description ?? null,
      format: demande.format ?? null,
      nombrePlaces: demande.nombrePlaces,
      estPrive: demande.estPrive,
      dateDebut: demande.dateDebut,
      dateFin: demande.dateFin,
      idOrganisateur,
      niveauRequis: demande.niveauRequis ?? NIVEAU_REQUIS_DEFAUT,
      lieu: {
        nom: demande.nomLieu ?? null,
        adresse: coordonnees.adresse,
        ville: coordonnees.ville,
        codePostal: coordonnees.codePostal,
        latitude: coordonnees.latitude,
        longitude: coordonnees.longitude,
        typeTerrain: demande.typeTerrain ?? null,
      },
    });
  }

  // Récupère un événement par son identifiant.
  async trouverParId(id: number): Promise<Evenement> {
    const evenement = await this.evenementRepository.trouverParId(id);

    if (!evenement || !evenement.estActif()) {
      throw new RessourceIntrouvable("Événement introuvable");
    }

    return evenement;
  }

  // Récupère un événement avec le détail de son lieu — pour la fiche événement.
  async trouverDetailParId(id: number): Promise<EvenementDetail> {
    const detail = await this.evenementRepository.trouverAvecLieu(id);

    if (!detail || !detail.evenement.estActif()) {
      throw new RessourceIntrouvable("Événement introuvable");
    }

    // Score de "Fiabilité" (voir CLAUDE.md, écart de périmètre maquette) :
    // composé ici, pas dans EvenementRepository, qui ne connaît pas la table
    // evaluation (une seule responsabilité par repository).
    const fiabilite = await this.evaluationRepository.moyenneParOrganisateur(detail.evenement.idOrganisateur);

    return { ...detail, organisateur: { ...detail.organisateur, fiabilite } };
  }

  // Modifie un événement existant. Réservé à l'organisateur.
  async modifier(id: number, demande: DemandeModification, idOrganisateur: number): Promise<Evenement> {
    const evenement = await this.trouverParId(id);

    if (!evenement.estOrganisePar(idOrganisateur)) {
      throw new AccesRefuse("Seul l'organisateur peut modifier cet événement");
    }

    if (evenement.statut === "Termine") {
      throw new Conflit("Cet événement est déjà terminé");
    }

    // Même règle qu'à la création : un événement ne peut pas être déplacé dans le passé.
    if (demande.dateDebut && demande.dateDebut <= new Date()) {
      throw new RequeteInvalide("La date de début doit être dans le futur", "dateDebut");
    }

    const dateDebutEffective = demande.dateDebut ?? evenement.dateDebut;
    const dateFinEffective = demande.dateFin ?? evenement.dateFin;
    if (dateFinEffective <= dateDebutEffective) {
      throw new RequeteInvalide("La date de fin doit suivre la date de début", "dateFin");
    }

    // On ne peut pas réduire les places sous le nombre de joueurs déjà acceptés.
    if (demande.nombrePlaces !== undefined && demande.nombrePlaces < evenement.nombreInscrits) {
      throw new RequeteInvalide(
        `Le nombre de places ne peut pas être inférieur au nombre d'inscrits (${evenement.nombreInscrits})`,
        "nombrePlaces"
      );
    }

    return this.evenementRepository.modifier(id, demande);
  }

  // Annule un événement. Réservé à l'organisateur, ou à un administrateur (modération).
  async annuler(id: number, idDemandeur: number, roleDemandeur: Role): Promise<void> {
    const evenement = await this.trouverParId(id);

    if (roleDemandeur !== "administrateur" && !evenement.estOrganisePar(idDemandeur)) {
      throw new AccesRefuse("Seul l'organisateur ou un administrateur peut annuler cet événement");
    }

    await this.evenementRepository.desactiver(id);

    // Prévenir les inscrits acceptés (pas ceux en attente, jamais garantis une
    // place) — ils n'avaient jusqu'ici aucun signal autre que la disparition
    // de l'événement (voir CLAUDE.md, "Évolutions envisagées").
    await this.notifierInscritsAcceptes(id, "evenement_annule");
  }

  // Clôture l'événement une fois les présences relevées. Réservé à l'organisateur :
  // à la différence de l'annulation, ce n'est pas une action de modération.
  async terminer(id: number, idOrganisateur: number): Promise<void> {
    const evenement = await this.trouverParId(id);

    if (!evenement.estOrganisePar(idOrganisateur)) {
      throw new AccesRefuse("Seul l'organisateur peut terminer cet événement");
    }

    // Repéré le 24/09/2026 (porteur de projet) : rien n'empêchait jusqu'ici
    // de terminer un événement qui n'avait pas encore eu lieu — "Terminer"
    // se comportait alors comme une annulation déguisée. Seule la date de
    // début compte, pas la date de fin : un organisateur doit pouvoir
    // clôturer avant l'heure de fin prévue si tout le monde a fini de jouer
    // (cf. la révision du 20/09/2026 qui refuse déjà de bloquer sur les
    // présences pour la même raison).
    if (evenement.dateDebut > new Date()) {
      throw new Conflit("Cet événement n'a pas encore commencé");
    }

    if (evenement.statut === "Termine") {
      throw new Conflit("Cet événement est déjà terminé");
    }

    await this.evenementRepository.terminer(id);

    // Signale aux inscrits acceptés qu'ils peuvent désormais évaluer
    // l'organisateur (voir CLAUDE.md, section Évaluations) — sans ça, rien ne
    // les ramène sur la fiche une fois l'événement clos.
    await this.notifierInscritsAcceptes(id, "evenement_termine");
  }

  // Écran Profil : événements organisés par ce joueur, et ceux qu'il a rejoints
  // (acceptés / en attente), terminés inclus. Les demandes refusées n'apparaissent
  // volontairement dans aucune des trois listes (voir CLAUDE.md, "Évolutions envisagées").
  async listerMesEvenements(idJoueur: number): Promise<MesEvenements> {
    const [organises, inscriptionsAcceptees, inscriptionsEnAttente] = await Promise.all([
      this.evenementRepository.listerParOrganisateur(idJoueur),
      this.inscriptionRepository.listerParJoueur(idJoueur, ["acceptee"]),
      this.inscriptionRepository.listerParJoueur(idJoueur, ["en_attente"]),
    ]);

    const [participe, enAttente] = await Promise.all([
      this.resoudreEvenementsActifs(inscriptionsAcceptees.map((inscription) => inscription.idEvenement)),
      this.resoudreEvenementsActifs(inscriptionsEnAttente.map((inscription) => inscription.idEvenement)),
    ]);

    return { organises, participe, enAttente };
  }

  // Filet de sécurité : clôture les événements qu'un organisateur a oublié de
  // terminer, une fois la marge de sécurité passée. Appelé périodiquement
  // (voir server.ts), jamais depuis une route HTTP. Même notification que la
  // clôture manuelle (voir terminer) : un organisateur qui oublie de clôturer
  // ne doit pas priver ses inscrits du signal pour évaluer.
  async terminerEvenementsExpires(): Promise<number> {
    const dateLimite = new Date(Date.now() - MARGE_CLOTURE_AUTO_MS);
    const idsClotures = await this.evenementRepository.terminerAvantDate(dateLimite);

    for (const id of idsClotures) {
      await this.notifierInscritsAcceptes(id, "evenement_termine");
    }

    return idsClotures.length;
  }

  // Prévient chaque inscrit accepté d'un événement (pas ceux en attente,
  // jamais garantis une place) — factorisé, utilisé par annuler/terminer/
  // terminerEvenementsExpires.
  private async notifierInscritsAcceptes(id: number, type: TypeNotification): Promise<void> {
    const inscrits = await this.inscriptionRepository.listerParEvenement(id);
    for (const inscrit of inscrits.filter((i) => i.statut === "acceptee")) {
      await this.notification.notifier(inscrit.idJoueur, type, id);
    }
  }

  // Résout des identifiants d'inscription vers leurs événements, en excluant les
  // annulés (soft delete) — une inscription à un événement annulé ne doit pas
  // resurgir sur le Profil.
  private async resoudreEvenementsActifs(idsEvenements: number[]): Promise<Evenement[]> {
    const evenements = await Promise.all(idsEvenements.map((id) => this.evenementRepository.trouverParId(id)));
    return evenements.filter((evenement): evenement is Evenement => evenement !== null && evenement.estActif());
  }
}