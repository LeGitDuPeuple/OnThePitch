import { Link } from "react-router-dom";

export const PiedDePage = () => (
  <footer className="pied-de-page texte-attenue">
    <Link to="/aide">Aide</Link>
    <Link to="/mentions-legales">Mentions légales</Link>
    <Link to="/confidentialite">Confidentialité</Link>
  </footer>
);
