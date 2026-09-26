import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useAppSelector } from "../store/hooks";
import { useEmailForm } from "../hooks/useEmailForm";
import { useMotDePasseForm } from "../hooks/useMotDePasseForm";
import { useDoubleAuth } from "../hooks/useDoubleAuth";
import { useSuppressionCompte } from "../hooks/useSuppressionCompte";
import { ErreurChamp } from "../components/ErreurChamp";
import { MessageConfirmation } from "../components/MessageConfirmation";
import "../styles/monCompte.css";
import { TitrePage } from "../components/TitrePage";

export const MonCompte = () => {
  const { utilisateur, chargementInitial } = useAppSelector((state) => state.auth);

  if (chargementInitial) return <p className="page-compte">Chargement…</p>;

  if (!utilisateur) {
    return (
      <main className="page-compte">
<TitrePage titre={"Mon compte"} description={"Gérez votre adresse email, votre mot de passe et votre double authentification."} indexable={false} />
        <p>
          Vous devez être connecté pour accéder à votre compte. <Link to="/connexion">Se connecter</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="page-compte">
<TitrePage titre={"Mon compte"} description={"Gérez votre adresse email, votre mot de passe et votre double authentification."} indexable={false} />
      <h1>Mon compte</h1>
      <SectionEmail />
      <SectionMotDePasse />
      <SectionDoubleAuth />
      {utilisateur.role === "joueur" && <SectionSuppression />}
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

// Groupe le secret par blocs de 4 caractères (lisible, pour une saisie manuelle
// quand le QR code ne peut pas être scanné).
const grouperSecret = (secret: string) => secret.match(/.{1,4}/g)?.join(" ") ?? secret;

const SectionDoubleAuth = () => {
  const {
    active,
    etape,
    configuration,
    codesSecours,
    codesSauvegardes,
    setCodesSauvegardes,
    codesCopies,
    code,
    setCode,
    erreurCode,
    erreur,
    chargement,
    commencerActivation,
    confirmerActivation,
    terminerCodesSecours,
    copierCodesSecours,
    annuler,
    commencerDesactivation,
    confirmerDesactivation,
  } = useDoubleAuth();

  return (
    <section className="carte-compte">
      <h2>
        Double authentification{" "}
        {active && etape !== "codesSecours" && <span className="badge badge--marque">Activée</span>}
      </h2>

      {etape === "repos" && !active && (
        <>
          <p className="texte-attenue">
            Ajoutez une seconde vérification à la connexion : un code à 6 chiffres généré par une application
            d'authentification sur votre téléphone (Microsoft Authenticator, Google Authenticator...). Facultatif.
          </p>
          {erreur && (
            <p role="alert" className="message-erreur">
              {erreur}
            </p>
          )}
          <button type="button" onClick={() => void commencerActivation()} disabled={chargement}>
            {chargement ? "Préparation…" : "Activer la double authentification"}
          </button>
        </>
      )}

      {etape === "repos" && active && (
        <>
          <p className="texte-attenue">
            Un code de votre application d'authentification (ou un code de secours) est demandé à chaque connexion.
          </p>
          <button type="button" className="bouton-danger" onClick={commencerDesactivation}>
            Désactiver la double authentification
          </button>
        </>
      )}

      {etape === "configuration" && configuration && (
        <form onSubmit={confirmerActivation}>
          <ol className="etapes-double-auth">
            <li>Installez Microsoft Authenticator (ou Google Authenticator) sur votre téléphone.</li>
            <li>
              Dans l'application : « + » puis « Autre compte » (ou « Compte personnel »), et scannez ce QR code.
            </li>
            <li>Saisissez ci-dessous le code à 6 chiffres qu'elle affiche.</li>
          </ol>
          <div className="qr-double-auth">
            <QRCodeSVG value={configuration.uri} size={168} />
          </div>
          <p className="texte-attenue">
            Impossible de scanner ? Saisissez ce secret dans l'application :{" "}
            <code className="secret-double-auth">{grouperSecret(configuration.secret)}</code>
          </p>
          <label>
            Code à 6 chiffres
            <input
              type="text"
              value={code}
              onChange={(evenement) => setCode(evenement.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
            <ErreurChamp message={erreurCode ?? undefined} />
          </label>
          {erreur && (
            <p role="alert" className="message-erreur">
              {erreur}
            </p>
          )}
          <div className="actions-compte">
            <button type="submit" disabled={chargement}>
              {chargement ? "Vérification…" : "Confirmer et activer"}
            </button>
            <button type="button" className="bouton-secondaire" onClick={annuler} disabled={chargement}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {etape === "codesSecours" && (
        <div className="codes-secours-bloc">
          <p className="message-confirmation message-confirmation--avertissement" role="alert">
            <span>
              <strong>Double authentification activée.</strong> Notez ces 10 codes de secours et gardez-les en lieu
              sûr : ils permettent de vous connecter si vous perdez votre téléphone. Chacun ne sert qu'une fois, et
              ils ne seront <strong>plus jamais affichés</strong>.
            </span>
          </p>
          <ul className="codes-secours">
            {codesSecours.map((codeSecours) => (
              <li key={codeSecours}>
                <code>{codeSecours}</code>
              </li>
            ))}
          </ul>
          <button type="button" className="bouton-secondaire" onClick={() => void copierCodesSecours()}>
            {codesCopies ? "Codes copiés" : "Copier les codes"}
          </button>
          <label className="case-a-cocher">
            <input
              type="checkbox"
              checked={codesSauvegardes}
              onChange={(evenement) => setCodesSauvegardes(evenement.target.checked)}
            />
            J'ai sauvegardé mes codes de secours
          </label>
          <button type="button" onClick={terminerCodesSecours} disabled={!codesSauvegardes}>
            Terminer
          </button>
        </div>
      )}

      {etape === "desactivation" && (
        <form onSubmit={confirmerDesactivation}>
          <p className="texte-attenue">
            Pour confirmer, saisissez un code de votre application d'authentification (ou un code de secours). La
            désactivation supprime aussi les codes de secours restants.
          </p>
          <label>
            Code de vérification
            <input
              type="text"
              value={code}
              onChange={(evenement) => setCode(evenement.target.value)}
              autoComplete="one-time-code"
              required
            />
            <ErreurChamp message={erreurCode ?? undefined} />
          </label>
          {erreur && (
            <p role="alert" className="message-erreur">
              {erreur}
            </p>
          )}
          <div className="actions-compte">
            <button type="submit" className="bouton-danger" disabled={chargement}>
              {chargement ? "Vérification…" : "Désactiver"}
            </button>
            <button type="button" className="bouton-secondaire" onClick={annuler} disabled={chargement}>
              Annuler
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

const SectionSuppression = () => {
  const {
    etape,
    doubleAuthActive,
    motDePasse,
    setMotDePasse,
    code,
    setCode,
    erreurMotDePasse,
    erreurCode,
    erreur,
    chargement,
    commencer,
    annuler,
    soumettre,
  } = useSuppressionCompte();

  return (
    <section className="carte-compte carte-compte--danger">
      <h2>Supprimer mon compte</h2>

      {etape === "repos" && (
        <>
          <p className="texte-attenue">
            Vos données personnelles (nom, prénom, email, ville) sont effacées et vous ne pouvez plus vous connecter.
            Vos événements à venir sont annulés (les inscrits sont prévenus) et vos inscriptions à venir sont retirées.
            Cette action est définitive.
          </p>
          <button type="button" className="bouton-danger" onClick={commencer}>
            Supprimer mon compte
          </button>
        </>
      )}

      {etape === "confirmation" && (
        <form onSubmit={soumettre}>
          <p className="texte-attenue">Pour confirmer, saisissez votre mot de passe.</p>
          <label>
            Mot de passe
            <input
              type="password"
              value={motDePasse}
              onChange={(evenement) => setMotDePasse(evenement.target.value)}
              autoComplete="current-password"
              required
            />
            <ErreurChamp message={erreurMotDePasse ?? undefined} />
          </label>
          {doubleAuthActive && (
            <label>
              Code de double authentification
              <input
                type="text"
                value={code}
                onChange={(evenement) => setCode(evenement.target.value)}
                autoComplete="one-time-code"
                required
              />
              <ErreurChamp message={erreurCode ?? undefined} />
            </label>
          )}
          {erreur && (
            <p role="alert" className="message-erreur">
              {erreur}
            </p>
          )}
          <div className="actions-compte">
            <button type="submit" className="bouton-danger" disabled={chargement}>
              {chargement ? "Suppression…" : "Supprimer définitivement"}
            </button>
            <button type="button" className="bouton-secondaire" onClick={annuler} disabled={chargement}>
              Annuler
            </button>
          </div>
        </form>
      )}
    </section>
  );
};
