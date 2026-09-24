import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { DoubleAuthService } from "../../src/services/doubleAuthService";
import { AuthService } from "../../src/services/authService";
import { Conflit, NonAuthentifie, RequeteInvalide, RessourceIntrouvable } from "../../src/domain/erreurMetier";
import { UtilisateurRepositoryFake } from "../doubles/UtilisateurRepositoryFake";
import { TotpFake, CODE_TOTP_VALIDE } from "../doubles/TotpFake";

const preparer = async () => {
  const repository = new UtilisateurRepositoryFake();
  const utilisateur = await new AuthService(repository).inscrire({
    nom: "Dupont",
    prenom: "Jean",
    email: "jean@example.com",
    motDePasse: "MotDePasse123!",
  });
  const service = new DoubleAuthService(repository, new TotpFake());
  return { repository, utilisateur, service };
};

// Configure ET active la 2FA, renvoie les codes de secours en clair.
const activer = async () => {
  const contexte = await preparer();
  await contexte.service.initialiser(contexte.utilisateur.id);
  const codes = await contexte.service.activer(contexte.utilisateur.id, CODE_TOTP_VALIDE);
  return { ...contexte, codes };
};

// Jeton temporaire tel que le fabrique AuthService, pour la connexion en deux temps.
const jetonTemporaireDe = async (repository: UtilisateurRepositoryFake) => {
  const resultat = await new AuthService(repository).connecter({
    email: "jean@example.com",
    motDePasse: "MotDePasse123!",
  });
  if (!resultat.doubleAuthRequise) throw new Error("La 2FA devrait être active");
  return resultat.jetonTemporaire;
};

describe("DoubleAuthService", () => {
  describe("initialiser", () => {
    it("génère un secret et l'adresse otpauth://, sans activer la 2FA", async () => {
      const { service, utilisateur, repository } = await preparer();

      const { secret, uri } = await service.initialiser(utilisateur.id);

      expect(secret).toBe("SECRETDETEST");
      expect(uri).toContain("otpauth://");
      expect((await repository.trouverParId(utilisateur.id))?.doubleAuthActive).toBe(false);
    });

    it("refuse si la 2FA est déjà active (n'écrase pas le secret en service)", async () => {
      const { service, utilisateur } = await activer();

      await expect(service.initialiser(utilisateur.id)).rejects.toBeInstanceOf(Conflit);
    });

    it("lève RessourceIntrouvable pour un utilisateur inconnu", async () => {
      const { service } = await preparer();

      await expect(service.initialiser(999)).rejects.toBeInstanceOf(RessourceIntrouvable);
    });
  });

  describe("activer", () => {
    it("active la 2FA avec un code valide et renvoie 10 codes de secours distincts", async () => {
      const { service, utilisateur, repository } = await preparer();
      await service.initialiser(utilisateur.id);

      const codes = await service.activer(utilisateur.id, CODE_TOTP_VALIDE);

      expect(codes).toHaveLength(10);
      expect(new Set(codes).size).toBe(10);
      expect(codes[0]).toMatch(/^[0-9A-F]{5}-[0-9A-F]{5}$/);
      expect((await repository.trouverParId(utilisateur.id))?.doubleAuthActive).toBe(true);
    });

    it("ne conserve que des hachages : les codes en clair ne sont plus jamais lisibles", async () => {
      const { codes, utilisateur, repository } = await activer();

      const hachages = (await repository.trouverParId(utilisateur.id))!.codesSecours;

      expect(hachages).toHaveLength(10);
      for (const code of codes) {
        expect(hachages).not.toContain(code);
        expect(hachages).not.toContain(code.replace("-", ""));
      }
      expect(await bcrypt.compare(codes[0].replace("-", ""), hachages[0])).toBe(true);
    });

    it("refuse un code invalide et laisse la 2FA inactive", async () => {
      const { service, utilisateur, repository } = await preparer();
      await service.initialiser(utilisateur.id);

      const tentative = service.activer(utilisateur.id, "000000");

      await expect(tentative).rejects.toBeInstanceOf(RequeteInvalide);
      await expect(tentative).rejects.toMatchObject({ champ: "code" });
      expect((await repository.trouverParId(utilisateur.id))?.doubleAuthActive).toBe(false);
    });

    it("refuse si la configuration n'a pas été lancée", async () => {
      const { service, utilisateur } = await preparer();

      await expect(service.activer(utilisateur.id, CODE_TOTP_VALIDE)).rejects.toBeInstanceOf(RequeteInvalide);
    });

    it("refuse si la 2FA est déjà active", async () => {
      const { service, utilisateur } = await activer();

      await expect(service.activer(utilisateur.id, CODE_TOTP_VALIDE)).rejects.toBeInstanceOf(Conflit);
    });
  });

  describe("desactiver", () => {
    it("désactive avec un code TOTP valide et efface secret et codes de secours", async () => {
      const { service, utilisateur, repository } = await activer();

      await service.desactiver(utilisateur.id, CODE_TOTP_VALIDE);

      const relu = await repository.trouverParId(utilisateur.id);
      expect(relu?.doubleAuthActive).toBe(false);
      expect(relu?.secretDoubleAuth).toBeNull();
      expect(relu?.codesSecours).toEqual([]);
    });

    it("accepte aussi un code de secours", async () => {
      const { service, utilisateur, repository, codes } = await activer();

      await service.desactiver(utilisateur.id, codes[3]);

      expect((await repository.trouverParId(utilisateur.id))?.doubleAuthActive).toBe(false);
    });

    it("refuse un code invalide : la 2FA reste active", async () => {
      const { service, utilisateur, repository } = await activer();

      await expect(service.desactiver(utilisateur.id, "000000")).rejects.toBeInstanceOf(RequeteInvalide);
      expect((await repository.trouverParId(utilisateur.id))?.doubleAuthActive).toBe(true);
    });

    it("refuse si la 2FA n'est pas activée", async () => {
      const { service, utilisateur } = await preparer();

      await expect(service.desactiver(utilisateur.id, CODE_TOTP_VALIDE)).rejects.toBeInstanceOf(RequeteInvalide);
    });

    it("après désactivation, on peut la réactiver : nouveau secret, nouveaux codes, anciens invalidés", async () => {
      const { service, utilisateur, codes } = await activer();
      await service.desactiver(utilisateur.id, CODE_TOTP_VALIDE);
      await service.initialiser(utilisateur.id);

      const nouveauxCodes = await service.activer(utilisateur.id, CODE_TOTP_VALIDE);

      expect(nouveauxCodes).toHaveLength(10);
      expect(nouveauxCodes).not.toContain(codes[0]);
      // Un ancien code de secours ne fonctionne plus.
      await expect(service.desactiver(utilisateur.id, codes[0])).rejects.toBeInstanceOf(RequeteInvalide);
    });
  });

  describe("terminerConnexion", () => {
    it("ouvre la session avec le jeton temporaire et un code TOTP valide", async () => {
      const { service, repository } = await activer();
      const jetonTemporaire = await jetonTemporaireDe(repository);

      const { jeton, utilisateur } = await service.terminerConnexion(jetonTemporaire, CODE_TOTP_VALIDE);

      expect(jeton.split(".")).toHaveLength(3);
      expect(utilisateur.email).toBe("jean@example.com");
    });

    it("accepte un code de secours, avec ou sans tiret, et le consomme (usage unique)", async () => {
      const { service, repository, codes } = await activer();

      await service.terminerConnexion(await jetonTemporaireDe(repository), codes[0]);

      // Le même code ne fonctionne pas une seconde fois.
      await expect(
        service.terminerConnexion(await jetonTemporaireDe(repository), codes[0])
      ).rejects.toBeInstanceOf(NonAuthentifie);
      // Un autre code, saisi sans tiret et en minuscules, fonctionne.
      await expect(
        service.terminerConnexion(await jetonTemporaireDe(repository), codes[1].replace("-", "").toLowerCase())
      ).resolves.toBeDefined();
    });

    it("refuse un code invalide", async () => {
      const { service, repository } = await activer();

      await expect(
        service.terminerConnexion(await jetonTemporaireDe(repository), "000000")
      ).rejects.toBeInstanceOf(NonAuthentifie);
    });

    it("refuse un jeton qui n'est pas un jeton temporaire (ex. un jeton de session)", async () => {
      const { service, utilisateur } = await activer();
      const jetonDeSession = jwt.sign({ id: utilisateur.id, role: "joueur" }, process.env["JWT_SECRET"]!);

      await expect(service.terminerConnexion(jetonDeSession, CODE_TOTP_VALIDE)).rejects.toBeInstanceOf(NonAuthentifie);
    });

    it("refuse un jeton temporaire expiré", async () => {
      const { service, utilisateur } = await activer();
      const expire = jwt.sign({ id: utilisateur.id, type: "2fa" }, process.env["JWT_SECRET"]!, { expiresIn: -10 });

      await expect(service.terminerConnexion(expire, CODE_TOTP_VALIDE)).rejects.toBeInstanceOf(NonAuthentifie);
    });

    it("refuse un jeton mal signé", async () => {
      const { service, utilisateur } = await activer();
      const falsifie = jwt.sign({ id: utilisateur.id, type: "2fa" }, "un-autre-secret");

      await expect(service.terminerConnexion(falsifie, CODE_TOTP_VALIDE)).rejects.toBeInstanceOf(NonAuthentifie);
    });

    it("refuse si la 2FA a été désactivée entre-temps", async () => {
      const { service, utilisateur, repository } = await activer();
      const jetonTemporaire = await jetonTemporaireDe(repository);
      await service.desactiver(utilisateur.id, CODE_TOTP_VALIDE);

      await expect(service.terminerConnexion(jetonTemporaire, CODE_TOTP_VALIDE)).rejects.toBeInstanceOf(
        NonAuthentifie
      );
    });
  });
});
