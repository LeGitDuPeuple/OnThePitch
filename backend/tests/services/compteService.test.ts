import bcrypt from "bcrypt";
import { CompteService } from "../../src/services/compteService";
import { AuthService } from "../../src/services/authService";
import { Conflit, NonAuthentifie, RequeteInvalide, RessourceIntrouvable } from "../../src/domain/erreurMetier";
import { UtilisateurRepositoryFake } from "../doubles/UtilisateurRepositoryFake";

const MOT_DE_PASSE = "MotDePasse123!";

// Prépare un compte réel (haché comme en production) et le service à tester.
const preparer = async (email = "jean@example.com") => {
  const repository = new UtilisateurRepositoryFake();
  const utilisateur = await new AuthService(repository).inscrire({
    nom: "Dupont",
    prenom: "Jean",
    email,
    motDePasse: MOT_DE_PASSE,
  });
  return { repository, utilisateur, service: new CompteService(repository) };
};

describe("CompteService", () => {
  describe("changerEmail", () => {
    it("change l'email quand le mot de passe est bon", async () => {
      const { service, utilisateur } = await preparer();

      const misAJour = await service.changerEmail(utilisateur.id, "nouveau@example.com", MOT_DE_PASSE);

      expect(misAJour.email).toBe("nouveau@example.com");
    });

    it("la nouvelle adresse sert ensuite à se connecter, l'ancienne plus", async () => {
      const { repository, service, utilisateur } = await preparer();
      await service.changerEmail(utilisateur.id, "nouveau@example.com", MOT_DE_PASSE);
      const auth = new AuthService(repository);

      await expect(auth.connecter({ email: "nouveau@example.com", motDePasse: MOT_DE_PASSE })).resolves.toBeDefined();
      await expect(auth.connecter({ email: "jean@example.com", motDePasse: MOT_DE_PASSE })).rejects.toBeInstanceOf(
        NonAuthentifie
      );
    });

    it("refuse un mot de passe incorrect, sur le champ motDePasse", async () => {
      const { service, utilisateur } = await preparer();

      const tentative = service.changerEmail(utilisateur.id, "nouveau@example.com", "MauvaisMotDePasse1!");

      await expect(tentative).rejects.toBeInstanceOf(RequeteInvalide);
      await expect(tentative).rejects.toMatchObject({ champ: "motDePasse" });
    });

    it("refuse une adresse déjà utilisée par un autre compte (409, champ email)", async () => {
      const { repository, service, utilisateur } = await preparer();
      await new AuthService(repository).inscrire({
        nom: "Martin",
        prenom: "Paul",
        email: "pris@example.com",
        motDePasse: MOT_DE_PASSE,
      });

      const tentative = service.changerEmail(utilisateur.id, "pris@example.com", MOT_DE_PASSE);

      await expect(tentative).rejects.toBeInstanceOf(Conflit);
      await expect(tentative).rejects.toMatchObject({ champ: "email" });
    });

    it("refuse de « changer » vers l'adresse actuelle", async () => {
      const { service, utilisateur } = await preparer();

      await expect(service.changerEmail(utilisateur.id, "jean@example.com", MOT_DE_PASSE)).rejects.toBeInstanceOf(
        RequeteInvalide
      );
    });

    it("lève RessourceIntrouvable pour un utilisateur inconnu", async () => {
      const { service } = await preparer();

      await expect(service.changerEmail(999, "nouveau@example.com", MOT_DE_PASSE)).rejects.toBeInstanceOf(
        RessourceIntrouvable
      );
    });
  });

  describe("changerMotDePasse", () => {
    it("change le mot de passe : le nouveau fonctionne, l'ancien plus", async () => {
      const { repository, service, utilisateur } = await preparer();

      await service.changerMotDePasse(utilisateur.id, MOT_DE_PASSE, "NouveauMdp456!");

      const auth = new AuthService(repository);
      await expect(auth.connecter({ email: "jean@example.com", motDePasse: "NouveauMdp456!" })).resolves.toBeDefined();
      await expect(auth.connecter({ email: "jean@example.com", motDePasse: MOT_DE_PASSE })).rejects.toBeInstanceOf(
        NonAuthentifie
      );
    });

    it("stocke un hachage, jamais le mot de passe en clair", async () => {
      const { repository, service, utilisateur } = await preparer();

      await service.changerMotDePasse(utilisateur.id, MOT_DE_PASSE, "NouveauMdp456!");

      const relu = await repository.trouverParId(utilisateur.id);
      expect(relu?.hachage).not.toBe("NouveauMdp456!");
      expect(await bcrypt.compare("NouveauMdp456!", relu!.hachage)).toBe(true);
    });

    it("refuse un mot de passe actuel incorrect, sur le champ motDePasseActuel", async () => {
      const { service, utilisateur } = await preparer();

      const tentative = service.changerMotDePasse(utilisateur.id, "Faux123456!", "NouveauMdp456!");

      await expect(tentative).rejects.toBeInstanceOf(RequeteInvalide);
      await expect(tentative).rejects.toMatchObject({ champ: "motDePasseActuel" });
    });

    it("refuse un nouveau mot de passe identique à l'actuel", async () => {
      const { service, utilisateur } = await preparer();

      await expect(service.changerMotDePasse(utilisateur.id, MOT_DE_PASSE, MOT_DE_PASSE)).rejects.toMatchObject({
        champ: "nouveauMotDePasse",
      });
    });
  });
});
