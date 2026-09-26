import { ContactService } from "../../src/services/contactService";
import { NotificationEmailFake } from "../doubles/NotificationEmailFake";

describe("ContactService", () => {
  it("transmet le message à l'adresse de support, avec l'identité de l'expéditeur", async () => {
    const email = new NotificationEmailFake();
    const service = new ContactService(email, "support@exemple.fr");

    await service.envoyer({ nom: "Jean Dupont", email: "jean@example.com", message: "Bonjour, une question." });

    expect(email.envoyes).toHaveLength(1);
    expect(email.envoyes[0].destinataire).toBe("support@exemple.fr");
    expect(email.envoyes[0].sujet).toContain("Jean Dupont");
    expect(email.envoyes[0].corps).toContain("jean@example.com");
    expect(email.envoyes[0].corps).toContain("Bonjour, une question.");
  });

  it("laisse remonter l'échec d'envoi (l'utilisateur ne doit pas croire son message parti)", async () => {
    const email = new NotificationEmailFake();
    email.envoyer = async () => {
      throw new Error("SMTP indisponible");
    };
    const service = new ContactService(email, "support@exemple.fr");

    await expect(
      service.envoyer({ nom: "Jean", email: "jean@example.com", message: "Un message assez long." })
    ).rejects.toThrow("SMTP indisponible");
  });
});
