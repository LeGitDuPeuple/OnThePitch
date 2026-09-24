import nodemailer, { Transporter } from "nodemailer";
import { NotificationEmailInterface } from "../domain/interface/notificationEmailInterface";

// Deux modes, choisis au démarrage selon la présence des variables SMTP_* :
// - configurées (voir .env.example) → vrai envoi, via ce compte
// - absentes → compte de test Ethereal (gratuit, sans inscription), créé à la
//   volée, aucun envoi réel — juste un lien de prévisualisation en console.
// Dans les deux cas, l'expéditeur ne change jamais pour l'appelant
// (NotificationService ne sait même pas lequel des deux tourne derrière).
export class NotificationEmailNodemailer implements NotificationEmailInterface {
  private transporteurPromesse: Promise<Transporter> | null = null;

  async envoyer(destinataire: string, sujet: string, corps: string): Promise<void> {
    const transporteur = await this.obtenirTransporteur();
    const info = await transporteur.sendMail({
      from: '"OnThePitch" <notifications@onthepitch.local>',
      to: destinataire,
      subject: sujet,
      text: corps,
    });

    // Lien de prévisualisation — seul Ethereal en renvoie un ; un vrai SMTP
    // ne renvoie rien ici (l'email est réellement parti, rien à prévisualiser).
    const urlApercu = nodemailer.getTestMessageUrl(info);
    if (urlApercu) {
      console.log(`[email] Aperçu (Ethereal, pas un envoi réel) : ${urlApercu}`);
    } else {
      console.log(`[email] Envoyé à ${destinataire} via ${process.env.SMTP_HOST}`);
    }
  }

  private async obtenirTransporteur(): Promise<Transporter> {
    if (!this.transporteurPromesse) {
      this.transporteurPromesse = this.creerTransporteur();
    }
    return this.transporteurPromesse;
  }

  private async creerTransporteur(): Promise<Transporter> {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
      const port = Number(SMTP_PORT);
      return nodemailer.createTransport({
        host: SMTP_HOST,
        port,
        secure: port === 465, // 465 = SSL implicite (Gmail) ; 587 = STARTTLS
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
    }

    const compte = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: compte.smtp.host,
      port: compte.smtp.port,
      secure: compte.smtp.secure,
      auth: { user: compte.user, pass: compte.pass },
    });
  }
}
