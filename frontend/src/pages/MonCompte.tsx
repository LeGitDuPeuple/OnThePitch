import { Link } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { useEmailForm } from "../hooks/useEmailForm";
import { useMotDePasseForm } from "../hooks/useMotDePasseForm";
import { ErreurChamp } from "../components/ErreurChamp";
import { MessageConfirmation } from "../components/MessageConfirmation";
import "../styles/monCompte.css";

export const MonCompte = () => {
  const { utilisateur, chargementInitial } = useAppSelector((state) => state.auth);

  if (chargementInitial) return <p className="page-compte">Chargement…</p>;

  if (!utilisateur) {
    return (
      <main className="page-compte">
        <p>
          Vous devez être connecté pour accéder à votre compte. <Link to="/connexion">Se connecter</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="page-compte">
      <h1>Mon compte</h1>
      <SectionEmail />
      <SectionMotDePasse />
    </main>
  );
};

const SectionEmail = () => {
  const {
    email,
    setEmail,
    motDePasse,
    setMotDePasse,
    erreurEmail,
    erreurMotDePasse,
    validerChampEmail,
    erreur,
    succes,
    effacerSucces,
    chargement,
    soumettre,
  } = useEmailForm();

  return (
    <section className="carte-compte">
      <h2>Adresse email</h2>
      <p className="texte-attenue">
        C'est votre identifiant de connexion, et l'adresse qui reçoit vos notifications.
      </p>
      <form onSubmit={soumettre}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(evenement) => setEmail(evenement.target.value)}
            onBlur={validerChampEmail}
            autoComplete="email"
            required
          />
          <ErreurChamp message={erreurEmail ?? undefined} />
        </label>
        <label>
          Mot de passe actuel (pour confirmer)
          <input
            type="password"
            value={motDePasse}
            onChange={(evenement) => setMotDePasse(evenement.target.value)}
            autoComplete="current-password"
            required
          />
          <ErreurChamp message={erreurMotDePasse ?? undefined} />
        </label>

        <MessageConfirmation message={succes} onFermer={effacerSucces} />
        {erreur && (
          <p role="alert" className="message-erreur">
            {erreur}
          </p>
        )}

        <button type="submit" disabled={chargement}>
          {chargement ? "Enregistrement…" : "Modifier l'adresse email"}
        </button>
      </form>
    </section>
  );
};

const SectionMotDePasse = () => {
  const {
    motDePasseActuel,
    setMotDePasseActuel,
    nouveauMotDePasse,
    setNouveauMotDePasse,
    confirmation,
    setConfirmation,
    erreurActuel,
    erreurNouveau,
    erreurConfirmation,
    validerChampNouveau,
    erreur,
    succes,
    effacerSucces,
    chargement,
    soumettre,
  } = useMotDePasseForm();

  return (
    <section className="carte-compte">
      <h2>Mot de passe</h2>
      <form onSubmit={soumettre}>
        <label>
          Mot de passe actuel
          <input
            type="password"
            value={motDePasseActuel}
            onChange={(evenement) => setMotDePasseActuel(evenement.target.value)}
            autoComplete="current-password"
            required
          />
          <ErreurChamp message={erreurActuel ?? undefined} />
        </label>
        <label>
          Nouveau mot de passe
          <input
            type="password"
            value={nouveauMotDePasse}
            onChange={(evenement) => setNouveauMotDePasse(evenement.target.value)}
            onBlur={validerChampNouveau}
            autoComplete="new-password"
            required
          />
          <ErreurChamp message={erreurNouveau ?? undefined} />
        </label>
        <label>
          Confirmer le nouveau mot de passe
          <input
            type="password"
            value={confirmation}
            onChange={(evenement) => setConfirmation(evenement.target.value)}
            autoComplete="new-password"
            required
          />
          <ErreurChamp message={erreurConfirmation ?? undefined} />
        </label>

        <MessageConfirmation message={succes} onFermer={effacerSucces} />
        {erreur && (
          <p role="alert" className="message-erreur">
            {erreur}
          </p>
        )}

        <button type="submit" disabled={chargement}>
          {chargement ? "Enregistrement…" : "Modifier le mot de passe"}
        </button>
      </form>
    </section>
  );
};
