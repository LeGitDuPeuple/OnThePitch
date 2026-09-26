import { Link } from "react-router-dom";
import "../styles/monCompte.css";
import "../styles/aide.css";
import { TitrePage } from "../components/TitrePage";

export const MentionsLegales = () => (
  <main className="page-compte page-legale">
<TitrePage titre={"Mentions légales"} description={"Mentions légales de la plateforme OnThePitch."} />
    <h1>Mentions légales</h1>

    <h2>Éditeur du site</h2>
    <p>
      OnThePitch est un projet réalisé par Sofiane Sahraoui dans le cadre de la certification Concepteur Développeur
      d'Applications (CDA). Il s'agit d'une application de démonstration, sans activité commerciale.
    </p>

    <h2>Contact</h2>
    <p>
      Pour toute question, utilisez le formulaire de la page <Link to="/aide">Aide</Link>.
    </p>

    <h2>Hébergement</h2>
    <p>
      L'application est fournie en environnement de démonstration ; elle n'est pas hébergée en production à ce jour.
      L'hébergeur sera indiqué ici lors d'une éventuelle mise en ligne.
    </p>

    <h2>Contenus publiés par les utilisateurs</h2>
    <p>
      Les annonces, descriptions et photos de lieux sont publiées sous la responsabilité de leurs auteurs, qui
      garantissent disposer des droits nécessaires (droit à l'image notamment). Toute annonce peut être signalée depuis
      sa fiche ; un administrateur peut la désactiver.
    </p>

    <h2>Propriété intellectuelle et données tierces</h2>
    <p>
      Les fonds de carte proviennent d'OpenStreetMap (© contributeurs OpenStreetMap). Le géocodage des adresses
      utilise l'API Adresse du gouvernement français (adresse.data.gouv.fr).
    </p>

    <p className="texte-attenue">
      Voir aussi la <Link to="/confidentialite">politique de confidentialité</Link>.
    </p>
  </main>
);
