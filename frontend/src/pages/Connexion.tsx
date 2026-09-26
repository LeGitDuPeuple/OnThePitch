import { Link } from "react-router-dom";
import { useConnexionForm } from "../hooks/useConnexionForm";
import { ErreurChamp } from "../components/ErreurChamp";
import { FormulaireCodeDoubleAuth } from "../components/FormulaireCodeDoubleAuth";
import "../styles/connexion.css";
import { TitrePage } from "../components/TitrePage";

export const Connexion = () => {
  const {
    email,
    setEmail,
    motDePasse,
    setMotDePasse,
    erreurEmail,
    validerChampEmail,
    erreur,
    chargement,
    soumettre,
    doubleAuth,
  } = useConnexionForm();

  return (
    <main className="page-connexion">
<TitrePage titre={"Connexion"} description={"Connectez-vous à votre compte OnThePitch."} indexable={false} />
      <h1>Connexion</h1>
      {doubleAuth.codeRequis ? (
        <FormulaireCodeDoubleAuth {...doubleAuth} />
      ) : (
        <form onSubmit={soumettre}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(evenement) => setEmail(evenement.target.value)}
              onBlur={validerChampEmail}
              required
            />
            <ErreurChamp message={erreurEmail ?? undefined} />
          </label>
          <label>
            Mot de passe
            <input
              type="password"
              value={motDePasse}
              onChange={(evenement) => setMotDePasse(evenement.target.value)}
              required
            />
          </label>

          {erreur && (
            <p role="alert" className="message-erreur">
              {erreur}
            </p>
          )}

          <button type="submit" disabled={chargement}>
            {chargement ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      )}

      <p className="lien-bas-formulaire">
        Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
      </p>
    </main>
  );
};
