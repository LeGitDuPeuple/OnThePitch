import { EvenementService } from "../../src/services/evenementService";
import { Evenement } from "../../src/domain/entities/Evenement";
import { Inscription } from "../../src/domain/entities/Inscription";
import { RequeteInvalide, RessourceIntrouvable, AccesRefuse, Conflit } from "../../src/domain/erreurMetier";
import { EvenementRepositoryFake } from "../doubles/EvenementRepositoryFake";
import { InscriptionRepositoryFake } from "../doubles/InscriptionRepositoryFake";
import { EvaluationRepositoryFake } from "../doubles/EvaluationRepositoryFake";
import { NotificationFake } from "../doubles/NotificationFake";
import { GeocodeurFake, coordonneesTest } from "../doubles/GeocodeurFake";

const dansUneSemaine = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const dansUneSemaineEtDeuxHeures = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000);

const demandeValide = () => ({
  titre: "Match du dimanche",
  adresse: "10 Rue de Rivoli, Paris",
  nombrePlaces: 10,
  estPrive: false,
  dateDebut: dansUneSemaine(),
  dateFin: dansUneSemaineEtDeuxHeures(),
});

describe("EvenementService", () => {
  describe("creer", () => {
    it("géocode l'adresse et crée l'événement", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );

      const evenement = await service.creer(demandeValide(), 1);

      expect(evenement.titre).toBe("Match du dimanche");
      expect(evenement.statut).toBe("Ouvert");
      expect(evenement.idOrganisateur).toBe(1);
    });

    it("refuse une date de début dans le passé", async () => {
      const service = new EvenementService(
        new EvenementRepositoryFake(),
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const demande = { ...demandeValide(), dateDebut: new Date(Date.now() - 1000) };

      await expect(service.creer(demande, 1)).rejects.toBeInstanceOf(RequeteInvalide);
    });

    it("rattache l'erreur de date passée au champ dateDebut", async () => {
      const service = new EvenementService(
        new EvenementRepositoryFake(),
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const demande = { ...demandeValide(), dateDebut: new Date(Date.now() - 1000) };

      await expect(service.creer(demande, 1)).rejects.toMatchObject({ champ: "dateDebut" });
    });

    it("refuse la création si l'adresse ne peut pas être géocodée", async () => {
      const erreurGeocodage = new RequeteInvalide("Adresse introuvable, vérifiez la saisie");
      const service = new EvenementService(
        new EvenementRepositoryFake(),
        new GeocodeurFake(erreurGeocodage),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );

      await expect(service.creer(demandeValide(), 1)).rejects.toBe(erreurGeocodage);
    });
  });

  describe("trouverParId", () => {
    it("lève RessourceIntrouvable si l'événement n'existe pas", async () => {
      const service = new EvenementService(
        new EvenementRepositoryFake(),
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );

      await expect(service.trouverParId(999)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });

    it("lève RessourceIntrouvable si l'événement est désactivé", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const evenement = await service.creer(demandeValide(), 1);
      await evenementRepository.desactiver(evenement.id);

      await expect(service.trouverParId(evenement.id)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });
  });

  describe("trouverDetailParId", () => {
    it("renvoie l'événement avec le détail de son lieu", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const evenement = await service.creer(demandeValide(), 1);

      const detail = await service.trouverDetailParId(evenement.id);

      expect(detail.evenement.id).toBe(evenement.id);
      expect(detail.lieu.adresse).toBe(coordonneesTest.adresse);
    });

    it("lève RessourceIntrouvable si l'événement n'existe pas", async () => {
      const service = new EvenementService(
        new EvenementRepositoryFake(),
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );

      await expect(service.trouverDetailParId(999)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });

    it("expose la fiabilité de l'organisateur (moyenne de ses évaluations)", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const evaluationRepository = new EvaluationRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        evaluationRepository
      );
      const evenement = await service.creer(demandeValide(), 1);
      evaluationRepository.definirOrganisateur(evenement.id, 1);
      await evaluationRepository.creer({ idJoueur: 2, idEvenement: evenement.id, note: 4 });
      await evaluationRepository.creer({ idJoueur: 3, idEvenement: evenement.id, note: 2 });

      const detail = await service.trouverDetailParId(evenement.id);

      expect(detail.organisateur.fiabilite).toBe(3);
    });

    it("fiabilité null tant qu'aucune évaluation n'existe", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const evenement = await service.creer(demandeValide(), 1);

      const detail = await service.trouverDetailParId(evenement.id);

      expect(detail.organisateur.fiabilite).toBeNull();
    });
  });

  describe("modifier", () => {
    it("l'organisateur peut modifier titre, places, dates et niveau", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const evenement = await service.creer(demandeValide(), 1);
      const nouvelleDateDebut = dansUneSemaine();
      nouvelleDateDebut.setDate(nouvelleDateDebut.getDate() + 1);
      const nouvelleDateFin = new Date(nouvelleDateDebut.getTime() + 2 * 60 * 60 * 1000);

      const modifie = await service.modifier(
        evenement.id,
        { titre: "Match du lundi", nombrePlaces: 12, dateDebut: nouvelleDateDebut, dateFin: nouvelleDateFin, niveauRequis: "confirme" },
        1
      );

      expect(modifie.titre).toBe("Match du lundi");
      expect(modifie.nombrePlaces).toBe(12);
      expect(modifie.niveauRequis).toBe("confirme");
    });

    it("refuse la modification par un non-organisateur", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const evenement = await service.creer(demandeValide(), 1);

      await expect(service.modifier(evenement.id, { titre: "Autre titre" }, 2)).rejects.toBeInstanceOf(AccesRefuse);
    });

    it("refuse de modifier un événement inexistant", async () => {
      const service = new EvenementService(
        new EvenementRepositoryFake(),
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );

      await expect(service.modifier(999, { titre: "Autre titre" }, 1)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });

    it("refuse de modifier un événement déjà terminé", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const evenement = await service.creer(demandeValide(), 1);
      // Passe directement par le repository (pas service.terminer(), qui
      // exige désormais une dateDebut passée) : seul l'état "déjà terminé"
      // importe ici pour tester modifier().
      await evenementRepository.terminer(evenement.id);

      await expect(service.modifier(evenement.id, { titre: "Autre titre" }, 1)).rejects.toBeInstanceOf(Conflit);
    });

    it("refuse une nouvelle date de début dans le passé", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const evenement = await service.creer(demandeValide(), 1);

      await expect(
        service.modifier(evenement.id, { dateDebut: new Date(Date.now() - 1000) }, 1)
      ).rejects.toBeInstanceOf(RequeteInvalide);
    });

    it("refuse une date de fin antérieure ou égale à la date de début effective", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const evenement = await service.creer(demandeValide(), 1);

      await expect(
        service.modifier(evenement.id, { dateFin: new Date(evenement.dateDebut) }, 1) // égale à dateDebut existante
      ).rejects.toBeInstanceOf(RequeteInvalide);
    });

    it("rattache les erreurs de date au bon champ selon celui qui est fautif", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const evenement = await service.creer(demandeValide(), 1);

      await expect(
        service.modifier(evenement.id, { dateDebut: new Date(Date.now() - 1000) }, 1)
      ).rejects.toMatchObject({ champ: "dateDebut" });

      await expect(
        service.modifier(evenement.id, { dateFin: new Date(evenement.dateDebut) }, 1)
      ).rejects.toMatchObject({ champ: "dateFin" });
    });

    it("refuse de réduire le nombre de places sous le nombre d'inscrits", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const evenement = await service.creer(demandeValide(), 1);
      // Simule des inscriptions déjà acceptées, comme ailleurs dans ces tests
      // (le contrôle réel des places est testé en base, voir InscriptionRepositoryDatabase).
      evenement.nombreInscrits = 5;

      await expect(service.modifier(evenement.id, { nombrePlaces: 4 }, 1)).rejects.toBeInstanceOf(RequeteInvalide);
      await expect(service.modifier(evenement.id, { nombrePlaces: 4 }, 1)).rejects.toMatchObject({ champ: "nombrePlaces" });
    });
  });

  describe("annuler", () => {
    it("l'organisateur peut annuler son événement", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const evenement = await service.creer(demandeValide(), 1);

      await service.annuler(evenement.id, 1, "joueur");

      await expect(service.trouverParId(evenement.id)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });

    it("un administrateur peut annuler l'événement d'un autre joueur", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const evenement = await service.creer(demandeValide(), 1);

      await expect(service.annuler(evenement.id, 99, "administrateur")).resolves.toBeUndefined();
    });

    it("refuse l'annulation par un joueur qui n'est ni organisateur ni admin", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const evenement = await service.creer(demandeValide(), 1);

      await expect(service.annuler(evenement.id, 2, "joueur")).rejects.toBeInstanceOf(AccesRefuse);
    });
  });

  describe("terminer", () => {
    // "Terminer" exige désormais que l'événement ait commencé (voir plus bas,
    // "refuse de terminer un événement qui n'a pas encore commencé") — ces
    // tests ne peuvent donc plus passer par service.creer() (dateDebut future
    // imposée à la création) : l'événement est directement injecté dans le
    // double avec une dateDebut passée, comme pour terminerEvenementsExpires.
    const creerEvenementDejaCommence = (evenementRepository: EvenementRepositoryFake, id = 1): Evenement => {
      const evenement = new Evenement({
        id,
        titre: "Match du dimanche",
        nombrePlaces: 10,
        estPrive: false,
        dateDebut: new Date(Date.now() - 60 * 60 * 1000),
        dateFin: new Date(Date.now() + 60 * 60 * 1000),
        idLieu: 1,
        idOrganisateur: 1,
        statut: "Ouvert",
        niveauRequis: "tous_niveaux",
      });
      evenementRepository.ajouter(evenement);
      return evenement;
    };

    it("l'organisateur peut terminer l'événement", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const evenement = creerEvenementDejaCommence(evenementRepository);

      await service.terminer(evenement.id, 1);

      const relu = await evenementRepository.trouverParId(evenement.id);
      expect(relu?.statut).toBe("Termine");
    });

    it("refuse la clôture par un non-organisateur", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const evenement = creerEvenementDejaCommence(evenementRepository);

      await expect(service.terminer(evenement.id, 2)).rejects.toBeInstanceOf(AccesRefuse);
    });

    it("refuse de terminer un événement qui n'a pas encore commencé", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const evenement = await service.creer(demandeValide(), 1);

      await expect(service.terminer(evenement.id, 1)).rejects.toBeInstanceOf(Conflit);
    });

    it("refuse de terminer un événement déjà terminé", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );
      const evenement = creerEvenementDejaCommence(evenementRepository);
      await service.terminer(evenement.id, 1);

      await expect(service.terminer(evenement.id, 1)).rejects.toBeInstanceOf(Conflit);
    });

    it("notifie chaque inscrit accepté (pas ceux en attente) qu'il peut évaluer l'organisateur", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const notification = new NotificationFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        inscriptionRepository,
        notification,
        new EvaluationRepositoryFake()
      );
      const evenement = creerEvenementDejaCommence(evenementRepository);
      inscriptionRepository.ajouter(
        new Inscription({ idJoueur: 2, idEvenement: evenement.id, dateInscription: new Date(), statut: "acceptee" })
      );
      inscriptionRepository.ajouter(
        new Inscription({ idJoueur: 3, idEvenement: evenement.id, dateInscription: new Date(), statut: "en_attente" })
      );

      await service.terminer(evenement.id, 1);

      expect(notification.appels).toEqual([{ idJoueur: 2, type: "evenement_termine", idEvenement: evenement.id }]);
    });
  });

  describe("terminerEvenementsExpires", () => {
    it("clôture les événements terminés depuis plus de 3h, laisse les plus récents", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        new InscriptionRepositoryFake(),
        new NotificationFake(),
        new EvaluationRepositoryFake()
      );

      const ilYA4Heures = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const ilYA1Heure = new Date(Date.now() - 1 * 60 * 60 * 1000);

      evenementRepository.ajouter(
        new Evenement({
          id: 1,
          titre: "Oublié par l'organisateur",
          nombrePlaces: 10,
          estPrive: false,
          dateDebut: ilYA4Heures,
          dateFin: ilYA4Heures,
          idLieu: 1,
          idOrganisateur: 1,
          statut: "Ouvert",
          niveauRequis: "tous_niveaux",
        })
      );
      evenementRepository.ajouter(
        new Evenement({
          id: 2,
          titre: "Terminé il y a peu",
          nombrePlaces: 10,
          estPrive: false,
          dateDebut: ilYA1Heure,
          dateFin: ilYA1Heure,
          idLieu: 2,
          idOrganisateur: 1,
          statut: "Ouvert",
          niveauRequis: "tous_niveaux",
        })
      );

      const nombreClotures = await service.terminerEvenementsExpires();

      expect(nombreClotures).toBe(1);
      expect((await evenementRepository.trouverParId(1))?.statut).toBe("Termine");
      expect((await evenementRepository.trouverParId(2))?.statut).toBe("Ouvert");
    });

    it("notifie aussi les inscrits acceptés d'un événement clôturé automatiquement", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const inscriptionRepository = new InscriptionRepositoryFake();
      const notification = new NotificationFake();
      const service = new EvenementService(
        evenementRepository,
        new GeocodeurFake(coordonneesTest),
        inscriptionRepository,
        notification,
        new EvaluationRepositoryFake()
      );
      const ilYA4Heures = new Date(Date.now() - 4 * 60 * 60 * 1000);
      evenementRepository.ajouter(
        new Evenement({
          id: 1,
          titre: "Oublié par l'organisateur",
          nombrePlaces: 10,
          estPrive: false,
          dateDebut: ilYA4Heures,
          dateFin: ilYA4Heures,
          idLieu: 1,
          idOrganisateur: 1,
          statut: "Ouvert",
          niveauRequis: "tous_niveaux",
        })
      );
      inscriptionRepository.ajouter(
        new Inscription({ idJoueur: 2, idEvenement: 1, dateInscription: new Date(), statut: "acceptee" })
      );

      await service.terminerEvenementsExpires();

      expect(notification.appels).toEqual([{ idJoueur: 2, type: "evenement_termine", idEvenement: 1 }]);
    });
  });
});
