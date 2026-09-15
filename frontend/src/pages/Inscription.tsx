import { Link } from "react-router-dom";
import { useInscriptionForm } from "../hooks/useInscriptionForm";
import { ErreurChamp } from "../components/ErreurChamp";
import "../styles/connexion.css";

export const Inscription = () => {
  const {
    nom,
    setNom,
    prenom,
    setPrenom,
    email,
    setEmail,
    motDePasse,
    setMotDePasse,
    ville,
    setVille,
    erreurEmail,
    erreurMotDePasse,
    validerChampEmail,
    validerChampMotDePasse,
    erreur,
    chargement,
    soumettre,
  } = useInscriptionForm();

  return (
    <main className="page-connexion">
      <h1>Créer un compte</h1>
      <form onSubmit={soumettre}>
        <div className="ligne-champs">
          <label>
            Prénom
            <input type="text" value={prenom} onChange={(e) => setPrenom(e.target.value)} required minLength={2} maxLength={50} />
          </label>
          <label>
            Nom
            <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} required minLength={2} maxLength={50} />
          </label>
        </div>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={validerChampEmail} required />
          <ErreurChamp message={erreurEmail ?? undefined} />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            onBlur={validerChampMotDePasse}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <ErreurChamp message={erreurMotDePasse ?? undefined} />
        </label>
        <label>
          Ville (facultatif)
          <input type="text" value={ville} onChange={(e) => setVille(e.target.value)} maxLength={50} />
        </label>

        {erreur && (
          <p role="alert" className="message-erreur">
            {erreur}
          </p>
        )}

        <button type="submit" disabled={chargement}>
          {chargement ? "Création…" : "Créer mon compte"}
        </button>
      </form>

      <p className="lien-bas-formulaire">
        Déjà un compte ? <Link to="/connexion">Se connecter</Link>
      </p>
    </main>
  );
};
