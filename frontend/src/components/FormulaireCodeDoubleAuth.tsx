import type { ConnexionDoubleAuth } from "../hooks/useConnexionDoubleAuth";

// Seconde étape de la connexion : saisie du code. Rendue à la place du
// formulaire mot de passe, dans l'écran de connexion comme dans celui de l'admin.
export const FormulaireCodeDoubleAuth = ({ code, setCode, erreur, chargement, soumettreCode, recommencer }: ConnexionDoubleAuth) => (
  <form onSubmit={soumettreCode}>
    <p className="texte-attenue">
      Ouvrez votre application d'authentification (Microsoft Authenticator...) et saisissez le code à 6 chiffres.
      Pas de téléphone sous la main ? Saisissez un de vos codes de secours.
    </p>
    <label>
      Code de vérification
      <input
        type="text"
        value={code}
        onChange={(evenement) => setCode(evenement.target.value)}
        autoComplete="one-time-code"
        inputMode="text"
        autoFocus
        required
      />
    </label>

    {erreur && (
      <p role="alert" className="message-erreur">
        {erreur}
      </p>
    )}

    <button type="submit" disabled={chargement}>
      {chargement ? "Vérification…" : "Valider le code"}
    </button>
    <button type="button" className="bouton-secondaire" onClick={recommencer} disabled={chargement}>
      Retour
    </button>
  </form>
);
