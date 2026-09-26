import { Link } from "react-router-dom";
import "../styles/monCompte.css";
import "../styles/aide.css";
import { TitrePage } from "../components/TitrePage";

export const Confidentialite = () => (
  <main className="page-compte page-legale">
<TitrePage titre={"Politique de confidentialité"} description={"Données collectées par OnThePitch, cookies utilisés et droits des utilisateurs."} />
    <h1>Politique de confidentialité</h1>

    <h2>Responsable du traitement</h2>
    <p>
      Sofiane Sahraoui, éditeur d'OnThePitch (voir les <Link to="/mentions-legales">mentions légales</Link>).
    </p>

    <h2>Données collectées et finalités</h2>
    <ul>
      <li>
        <strong>Compte</strong> : nom, prénom, email, ville (facultative), mot de passe (conservé uniquement sous forme
        d'empreinte, jamais en clair). Finalité : vous identifier et gérer votre compte.
      </li>
      <li>
        <strong>Double authentification</strong> (facultative) : secret de l'application d'authentification et codes de
        secours (conservés sous forme d'empreintes). Finalité : sécuriser la connexion.
      </li>
      <li>
        <strong>Activité</strong> : événements créés (adresse du lieu, photo facultative), inscriptions, présences,
        évaluations, signalements, notifications. Finalité : faire fonctionner le service et la modération.
      </li>
      <li>
        <strong>Formulaire de contact</strong> : nom, email et message, transmis par email au support. Rien n'est
        conservé par l'application.
      </li>
    </ul>

    <h2>Cookies</h2>
    <p>
      Un seul cookie, strictement nécessaire : il porte votre session (24 heures), inaccessible au JavaScript de la
      page. Aucun cookie publicitaire ni de mesure d'audience.
    </p>

    <h2>Destinataires et services tiers</h2>
    <p>
      Vos données ne sont ni vendues ni cédées. Trois services tiers interviennent : l'API Adresse du gouvernement
      (reçoit les adresses saisies pour les convertir en coordonnées), OpenStreetMap (sert les fonds de carte, et voit
      donc l'adresse IP de votre navigateur), et le fournisseur d'envoi d'emails (notifications, contact).
    </p>

    <h2>Durée de conservation</h2>
    <p>
      Vos données sont conservées tant que votre compte existe. À la suppression du compte, elles sont effacées (voir
      ci-dessous).
    </p>

    <h2>Vos droits</h2>
    <ul>
      <li>
        <strong>Accès et rectification</strong> : votre email et votre mot de passe se modifient depuis{" "}
        <Link to="/compte">Mon compte</Link> ; pour corriger votre nom, prénom ou ville, écrivez-nous via la page{" "}
        <Link to="/aide">Aide</Link>.
      </li>
      <li>
        <strong>Effacement</strong> : « Supprimer mon compte » dans <Link to="/compte">Mon compte</Link>. Nom, prénom,
        email, ville, mot de passe et données de double authentification sont effacés ; vos événements à venir sont
        annulés et vos inscriptions à venir retirées. Les événements passés et évaluations auxquels vous avez pris part
        subsistent, sans plus aucun lien avec votre identité.
      </li>
      <li>
        <strong>Opposition, limitation, portabilité</strong> : écrivez-nous via la page <Link to="/aide">Aide</Link>.
      </li>
    </ul>
    <p>
      Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL
      (cnil.fr).
    </p>
  </main>
);
