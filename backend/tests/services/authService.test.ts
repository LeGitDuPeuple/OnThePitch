import { AuthService } from "../../src/services/authService";
import { Conflit, NonAuthentifie, RessourceIntrouvable } from "../../src/domain/erreurMetier";
import { UtilisateurRepositoryFake } from "../doubles/UtilisateurRepositoryFake";

const donneesInscription = {
  nom: "Dupont",
  prenom: "Jean",
  email: "jean.dupont@example.com",
  motDePasse: "MotDePasse123!",
};

describe("AuthService", () => {
  describe("inscrire", () => {
    it("hache le mot de passe et crée le compte", async () => {
      const service = new AuthService(new UtilisateurRepositoryFake());

      const utilisateur = await service.inscrire(donneesInscription);

      expect(utilisateur.email).toBe(donneesInscription.email);
      expect(utilisateur.hachage).not.toBe(donneesInscription.motDePasse);
    });

    it("refuse un email déjà utilisé", async () => {
      const repository = new UtilisateurRepositoryFake();
      const service = new AuthService(repository);
      await service.inscrire(donneesInscription);

      await expect(service.inscrire(donneesInscription)).rejects.toBeInstanceOf(Conflit);
      await expect(service.inscrire(donneesInscription)).rejects.toMatchObject({ champ: "email" });
    });
  });

  describe("connecter", () => {
    it("renvoie un jeton pour des identifiants valides", async () => {
      const repository = new UtilisateurRepositoryFake();
      const service = new AuthService(repository);
      await service.inscrire(donneesInscription);

      const resultat = await service.connecter({
        email: donneesInscription.email,
        motDePasse: donneesInscription.motDePasse,
      });

      expect(resultat.doubleAuthRequise).toBe(false);
      if (resultat.doubleAuthRequise) return; // narrowing TypeScript
      expect(typeof resultat.jeton).toBe("string");
      expect(resultat.jeton.split(".")).toHaveLength(3); // structure d'un JWT
    });

    it("avec la double authentification active : pas de session, un jeton temporaire", async () => {
      const repository = new UtilisateurRepositoryFake();
      const service = new AuthService(repository);
      const utilisateur = await service.inscrire(donneesInscription);
      await repository.activerDoubleAuth(utilisateur.id, []);

      const resultat = await service.connecter({
        email: donneesInscription.email,
        motDePasse: donneesInscription.motDePasse,
      });

      expect(resultat.doubleAuthRequise).toBe(true);
      expect(resultat).not.toHaveProperty("jeton");
      expect(resultat).toHaveProperty("jetonTemporaire");
    });

    it("avec la double authentification active, un mauvais mot de passe reste refusé avant tout", async () => {
      const repository = new UtilisateurRepositoryFake();
      const service = new AuthService(repository);
      const utilisateur = await service.inscrire(donneesInscription);
      await repository.activerDoubleAuth(utilisateur.id, []);

      await expect(
        service.connecter({ email: donneesInscription.email, motDePasse: "mauvais mot de passe" })
      ).rejects.toBeInstanceOf(NonAuthentifie);
    });

    it("refuse un email inconnu", async () => {
      const service = new AuthService(new UtilisateurRepositoryFake());

      await expect(
        service.connecter({ email: "inconnu@example.com", motDePasse: "peu importe" })
      ).rejects.toBeInstanceOf(NonAuthentifie);
    });

    it("refuse un mauvais mot de passe", async () => {
      const repository = new UtilisateurRepositoryFake();
      const service = new AuthService(repository);
      await service.inscrire(donneesInscription);

      await expect(
        service.connecter({ email: donneesInscription.email, motDePasse: "mauvais mot de passe" })
      ).rejects.toBeInstanceOf(NonAuthentifie);
    });
  });

  describe("trouverProfil", () => {
    it("lève RessourceIntrouvable si l'utilisateur n'existe pas", async () => {
      const service = new AuthService(new UtilisateurRepositoryFake());

      await expect(service.trouverProfil(999)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });
  });
});
