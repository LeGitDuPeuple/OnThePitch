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

      const { jeton } = await service.connecter({
        email: donneesInscription.email,
        motDePasse: donneesInscription.motDePasse,
      });

      expect(typeof jeton).toBe("string");
      expect(jeton.split(".")).toHaveLength(3); // structure d'un JWT
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
