import { ModerationService } from "../../src/services/moderationService";
import { Utilisateur } from "../../src/domain/entities/Utilisateur";
import { RessourceIntrouvable } from "../../src/domain/erreurMetier";
import { EvenementRepositoryFake } from "../doubles/EvenementRepositoryFake";
import { InscriptionRepositoryFake } from "../doubles/InscriptionRepositoryFake";
import { EvaluationRepositoryFake } from "../doubles/EvaluationRepositoryFake";
import { NotificationFake } from "../doubles/NotificationFake";
import { SignalementRepositoryFake } from "../doubles/SignalementRepositoryFake";
import { UtilisateurRepositoryFake } from "../doubles/UtilisateurRepositoryFake";
import { GeocodeurFake, coordonneesTest } from "../doubles/GeocodeurFake";
import { EvenementService } from "../../src/services/evenementService";

const ORGANISATEUR = 1;
const REPORTER = 2;

const creerEvenement = async (evenementRepository: EvenementRepositoryFake) => {
  const evenementService = new EvenementService(
    evenementRepository,
    new GeocodeurFake(coordonneesTest),
    new InscriptionRepositoryFake(),
    new NotificationFake(),
    new EvaluationRepositoryFake()
  );
  return evenementService.creer(
    {
      titre: "Match douteux",
      adresse: "10 Rue de Rivoli, Paris",
      nombrePlaces: 10,
      estPrive: false,
      dateDebut: new Date(Date.now() + 24 * 60 * 60 * 1000),
      dateFin: new Date(Date.now() + 26 * 60 * 60 * 1000),
    },
    ORGANISATEUR
  );
};

describe("ModerationService", () => {
  describe("listerMotifs", () => {
    it("renvoie les motifs disponibles pour signaler un événement", async () => {
      const service = new ModerationService(
        new SignalementRepositoryFake(),
        new EvenementRepositoryFake(),
        new UtilisateurRepositoryFake()
      );

      const motifs = await service.listerMotifs();

      expect(motifs.length).toBeGreaterThan(0);
      expect(motifs[0]).toEqual(expect.objectContaining({ id: expect.any(Number), libelle: expect.any(String) }));
    });
  });

  describe("signaler", () => {
    it("enregistre le signalement d'un événement actif", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const evenement = await creerEvenement(evenementRepository);
      const service = new ModerationService(
        new SignalementRepositoryFake(),
        evenementRepository,
        new UtilisateurRepositoryFake()
      );

      const signalement = await service.signaler(evenement.id, REPORTER, 1, "Ça sent l'arnaque");

      expect(signalement.idEvenement).toBe(evenement.id);
      expect(signalement.idMotif).toBe(1);
    });

    it("refuse de signaler un événement inexistant", async () => {
      const service = new ModerationService(
        new SignalementRepositoryFake(),
        new EvenementRepositoryFake(),
        new UtilisateurRepositoryFake()
      );

      await expect(service.signaler(999, REPORTER, 1)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });
  });

  describe("sanctionner", () => {
    it("désactive l'événement et avertit l'organisateur", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const utilisateurRepository = new UtilisateurRepositoryFake();
      const evenement = await creerEvenement(evenementRepository);
      const service = new ModerationService(new SignalementRepositoryFake(), evenementRepository, utilisateurRepository);

      await service.sanctionner(evenement.id);

      const relu = await evenementRepository.trouverParId(evenement.id);
      expect(relu?.estActif()).toBe(false);
      expect(utilisateurRepository.idsAvertis).toContain(ORGANISATEUR);
    });

    it("refuse de sanctionner un événement déjà désactivé", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const evenement = await creerEvenement(evenementRepository);
      await evenementRepository.desactiver(evenement.id);
      const service = new ModerationService(
        new SignalementRepositoryFake(),
        evenementRepository,
        new UtilisateurRepositoryFake()
      );

      await expect(service.sanctionner(evenement.id)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });
  });

  describe("rejeterSignalements", () => {
    it("retire les signalements sans toucher à l'événement", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const signalementRepository = new SignalementRepositoryFake();
      const evenement = await creerEvenement(evenementRepository);
      const service = new ModerationService(
        signalementRepository,
        evenementRepository,
        new UtilisateurRepositoryFake()
      );
      await service.signaler(evenement.id, REPORTER, 5, "Faux signalement");

      await service.rejeterSignalements(evenement.id);

      const enAttente = await signalementRepository.listerEnAttente();
      expect(enAttente).toHaveLength(0);
      const relu = await evenementRepository.trouverParId(evenement.id);
      expect(relu?.estActif()).toBe(true);
    });

    it("refuse de rejeter les signalements d'un événement inexistant", async () => {
      const service = new ModerationService(
        new SignalementRepositoryFake(),
        new EvenementRepositoryFake(),
        new UtilisateurRepositoryFake()
      );

      await expect(service.rejeterSignalements(999)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });
  });

  describe("obtenirStatistiques", () => {
    it("compte les événements par statut et les joueurs, en excluant les annulés", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const utilisateurRepository = new UtilisateurRepositoryFake();

      const evenementActif = await creerEvenement(evenementRepository);
      const evenementTermine = await creerEvenement(evenementRepository);
      await evenementRepository.terminer(evenementTermine.id);
      const evenementAnnule = await creerEvenement(evenementRepository);
      await evenementRepository.desactiver(evenementAnnule.id);

      utilisateurRepository.ajouter(
        new Utilisateur({
          id: 42,
          nom: "Test",
          prenom: "Joueur",
          email: "stats@example.com",
          motDePasseHache: "hash",
          role: "joueur",
          dateInscription: new Date(),
        })
      );

      const service = new ModerationService(new SignalementRepositoryFake(), evenementRepository, utilisateurRepository);

      const statistiques = await service.obtenirStatistiques();

      // 3 créés au total (actif + terminé + annulé), l'annulé compte quand
      // même dans "total" (jamais créé n'est effacé) mais pas dans les deux autres.
      expect(statistiques.totalEvenements).toBe(3);
      expect(statistiques.evenementsActifs).toBe(1);
      expect(statistiques.evenementsTermines).toBe(1);
      expect(statistiques.totalJoueurs).toBe(1);
    });
  });

  describe("listerEvenements", () => {
    it("filtre par statut, en traduisant 'Annule' sur dateDesactivation plutôt que sur le libellé", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const evenementOuvert = await creerEvenement(evenementRepository);
      const evenementTermine = await creerEvenement(evenementRepository);
      await evenementRepository.terminer(evenementTermine.id);
      const evenementAnnule = await creerEvenement(evenementRepository);
      await evenementRepository.desactiver(evenementAnnule.id);

      const service = new ModerationService(
        new SignalementRepositoryFake(),
        evenementRepository,
        new UtilisateurRepositoryFake()
      );

      const tous = await service.listerEvenements({});
      expect(tous.map((e) => e.evenement.id).sort()).toEqual(
        [evenementOuvert.id, evenementTermine.id, evenementAnnule.id].sort()
      );

      const ouverts = await service.listerEvenements({ statut: "Ouvert" });
      expect(ouverts.map((e) => e.evenement.id)).toEqual([evenementOuvert.id]);

      const annules = await service.listerEvenements({ statut: "Annule" });
      expect(annules.map((e) => e.evenement.id)).toEqual([evenementAnnule.id]);
    });

    it("filtre par plage de date de début", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const evenement = await creerEvenement(evenementRepository);
      const service = new ModerationService(
        new SignalementRepositoryFake(),
        evenementRepository,
        new UtilisateurRepositoryFake()
      );

      const dansLaFenetre = await service.listerEvenements({
        dateDebutMin: new Date(Date.now()),
        dateDebutMax: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });
      expect(dansLaFenetre.map((e) => e.evenement.id)).toEqual([evenement.id]);

      const horsFenetre = await service.listerEvenements({
        dateDebutMin: new Date(Date.now() + 72 * 60 * 60 * 1000),
      });
      expect(horsFenetre).toEqual([]);
    });
  });
});
