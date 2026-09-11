import { EvenementService } from "../../src/services/evenementService";
import { RequeteInvalide, RessourceIntrouvable, AccesRefuse, Conflit } from "../../src/domain/erreurMetier";
import { EvenementRepositoryFake } from "../doubles/EvenementRepositoryFake";
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
      const service = new EvenementService(evenementRepository, new GeocodeurFake(coordonneesTest));

      const evenement = await service.creer(demandeValide(), 1);

      expect(evenement.titre).toBe("Match du dimanche");
      expect(evenement.statut).toBe("Ouvert");
      expect(evenement.idOrganisateur).toBe(1);
    });

    it("refuse une date de début dans le passé", async () => {
      const service = new EvenementService(new EvenementRepositoryFake(), new GeocodeurFake(coordonneesTest));
      const demande = { ...demandeValide(), dateDebut: new Date(Date.now() - 1000) };

      await expect(service.creer(demande, 1)).rejects.toBeInstanceOf(RequeteInvalide);
    });

    it("refuse la création si l'adresse ne peut pas être géocodée", async () => {
      const erreurGeocodage = new RequeteInvalide("Adresse introuvable, vérifiez la saisie");
      const service = new EvenementService(new EvenementRepositoryFake(), new GeocodeurFake(erreurGeocodage));

      await expect(service.creer(demandeValide(), 1)).rejects.toBe(erreurGeocodage);
    });
  });

  describe("trouverParId", () => {
    it("lève RessourceIntrouvable si l'événement n'existe pas", async () => {
      const service = new EvenementService(new EvenementRepositoryFake(), new GeocodeurFake(coordonneesTest));

      await expect(service.trouverParId(999)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });

    it("lève RessourceIntrouvable si l'événement est désactivé", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(evenementRepository, new GeocodeurFake(coordonneesTest));
      const evenement = await service.creer(demandeValide(), 1);
      await evenementRepository.desactiver(evenement.id);

      await expect(service.trouverParId(evenement.id)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });
  });

  describe("annuler", () => {
    it("l'organisateur peut annuler son événement", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(evenementRepository, new GeocodeurFake(coordonneesTest));
      const evenement = await service.creer(demandeValide(), 1);

      await service.annuler(evenement.id, 1, "joueur");

      await expect(service.trouverParId(evenement.id)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });

    it("un administrateur peut annuler l'événement d'un autre joueur", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(evenementRepository, new GeocodeurFake(coordonneesTest));
      const evenement = await service.creer(demandeValide(), 1);

      await expect(service.annuler(evenement.id, 99, "administrateur")).resolves.toBeUndefined();
    });

    it("refuse l'annulation par un joueur qui n'est ni organisateur ni admin", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(evenementRepository, new GeocodeurFake(coordonneesTest));
      const evenement = await service.creer(demandeValide(), 1);

      await expect(service.annuler(evenement.id, 2, "joueur")).rejects.toBeInstanceOf(AccesRefuse);
    });
  });

  describe("terminer", () => {
    it("l'organisateur peut terminer l'événement", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(evenementRepository, new GeocodeurFake(coordonneesTest));
      const evenement = await service.creer(demandeValide(), 1);

      await service.terminer(evenement.id, 1);

      const relu = await evenementRepository.trouverParId(evenement.id);
      expect(relu?.statut).toBe("Termine");
    });

    it("refuse la clôture par un non-organisateur", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(evenementRepository, new GeocodeurFake(coordonneesTest));
      const evenement = await service.creer(demandeValide(), 1);

      await expect(service.terminer(evenement.id, 2)).rejects.toBeInstanceOf(AccesRefuse);
    });

    it("refuse de terminer un événement déjà terminé", async () => {
      const evenementRepository = new EvenementRepositoryFake();
      const service = new EvenementService(evenementRepository, new GeocodeurFake(coordonneesTest));
      const evenement = await service.creer(demandeValide(), 1);
      await service.terminer(evenement.id, 1);

      await expect(service.terminer(evenement.id, 1)).rejects.toBeInstanceOf(Conflit);
    });
  });
});
