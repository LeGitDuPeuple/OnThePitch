import { Link } from "react-router-dom";
import { useConnexionForm } from "../hooks/useConnexionForm";
import "../styles/connexion.css";

export const Connexion = () => {
  const { email, setEmail, motDePasse, setMotDePasse, erreur, chargement, soumettre } = useConnexionForm();

  return (
    <main className="page-connexion">
      <h1>Connexion</h1>
      <form onSubmit={soumettre}>
        <label>
          Email
          <input type="email" value={email} onChange={(evenement) => setEmail(evenement.target.value)} required />
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

      <p className="lien-bas-formulaire">
        Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
      </p>
    </main>
  );
};
