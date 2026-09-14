import { Link } from "react-router-dom";
import { useEntete } from "../hooks/useEntete";
import "../styles/entete.css";

// En-tête partagé par tous les écrans. Bascule en menu replié sur mobile
// (cf. CLAUDE.md, "Responsive" — navigation en menu) : mêmes liens, présentation
// différente selon la largeur, gérée en CSS (voir styles/entete.css).
export const Entete = () => {
  const { menuOuvert, basculerMenu, fermerMenu, utilisateur, deconnecter, deconnexionEnCours } = useEntete();

  return (
    <header className="entete">
      <div className="entete-barre">
        <Link to="/" className="entete-logo" onClick={fermerMenu}>
          OnThePitch
        </Link>
        <button type="button" className="entete-bouton-menu" onClick={basculerMenu} aria-expanded={menuOuvert} aria-label="Menu">
          ☰
        </button>
      </div>

      <nav className={menuOuvert ? "entete-nav entete-nav--ouvert" : "entete-nav"}>
        <Link to="/" onClick={fermerMenu}>
          Rechercher
        </Link>
        <Link to="/creer" onClick={fermerMenu}>
          Créer un événement
        </Link>
        {utilisateur?.role === "administrateur" && (
          <Link to="/admin" onClick={fermerMenu}>
            Admin
          </Link>
        )}

        <div className="entete-compte">
          {utilisateur ? (
            <>
              <span>
                {utilisateur.prenom} {utilisateur.nom}
              </span>
              <button
                type="button"
                className="bouton-secondaire"
                onClick={() => {
                  fermerMenu();
                  void deconnecter();
                }}
                disabled={deconnexionEnCours}
              >
                Se déconnecter
              </button>
            </>
          ) : (
            <Link to="/connexion" onClick={fermerMenu}>
              Connexion
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
};
