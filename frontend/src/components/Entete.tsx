import { Link, useLocation } from "react-router-dom";
import { useEntete } from "../hooks/useEntete";
import { Avatar } from "./Avatar";
import "../styles/entete.css";

// En-tête partagé par tous les écrans (voir OnThePitch-maquettes-planche.png,
// 2.2.a — logo, nav, bouton "Créer une annonce", avatar). Bascule en menu
// replié sur mobile (cf. CLAUDE.md, "Responsive").
export const Entete = () => {
  const { menuOuvert, basculerMenu, fermerMenu, utilisateur, deconnecter, deconnexionEnCours } = useEntete();
  const { pathname } = useLocation();

  return (
    <header className="entete">
      <div className="entete-barre">
        <div className="entete-gauche">
          <Link to="/" className="entete-logo" onClick={fermerMenu}>
            OnThePitch
          </Link>
          <nav className={menuOuvert ? "entete-nav entete-nav--ouvert" : "entete-nav"}>
            <Link to="/" className={pathname === "/" ? "actif" : ""} onClick={fermerMenu}>
              Rechercher
            </Link>
            {utilisateur?.role === "administrateur" && (
              <Link to="/admin" className={pathname === "/admin" ? "actif" : ""} onClick={fermerMenu}>
                Admin
              </Link>
            )}

            <div className="entete-compte entete-compte--mobile">
              {utilisateur ? (
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
              ) : (
                <Link to="/connexion" className="bouton-secondaire" onClick={fermerMenu}>
                  Connexion / Inscription
                </Link>
              )}
            </div>
          </nav>
        </div>

        <div className="entete-droite">
          <Link to="/creer" className="bouton-creer" onClick={fermerMenu}>
            Créer une annonce
          </Link>

          <div className="entete-compte entete-compte--desktop">
            {utilisateur ? (
              <>
                <Avatar nom={utilisateur.nom} prenom={utilisateur.prenom} neutre />
                <button type="button" className="bouton-secondaire" onClick={() => void deconnecter()} disabled={deconnexionEnCours}>
                  Se déconnecter
                </button>
              </>
            ) : (
              <Link to="/connexion" className="bouton-secondaire">
                Connexion / Inscription
              </Link>
            )}
          </div>

          <button type="button" className="entete-bouton-menu" onClick={basculerMenu} aria-expanded={menuOuvert} aria-label="Menu">
            ☰
          </button>
        </div>
      </div>
    </header>
  );
};
