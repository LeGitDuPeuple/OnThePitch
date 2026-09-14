import { useAppSelector } from "../store/hooks";
import { useAdminConnexionForm } from "../hooks/useAdminConnexionForm";
import { useModeration } from "../hooks/useModeration";
import { useDeconnexion } from "../hooks/useDeconnexion";
import type { SignalementDetail } from "../types/moderation";
import "../styles/admin.css";

const formaterDate = (date: string) =>
  new Date(date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

export const Admin = () => {
  const { utilisateur, chargementInitial } = useAppSelector((state) => state.auth);

  if (chargementInitial) return <p className="page-admin">Chargement…</p>;

  if (!utilisateur) return <ConnexionAdmin />;

  // Garde de route côté front : confort d'usage uniquement. La vraie protection
  // est verifierRole('administrateur') côté API sur chaque route /moderation/...
  // (voir CLAUDE.md section 9) — une URL non devinable n'est pas un mécanisme
  // de sécurité.
  if (utilisateur.role !== "administrateur") {
    return (
      <main className="page-admin">
        <p>Ce tableau de bord est réservé aux administrateurs.</p>
      </main>
    );
  }

  return <TableauDeBord />;
};

const ConnexionAdmin = () => {
  const { email, setEmail, motDePasse, setMotDePasse, erreur, chargement, soumettre } = useAdminConnexionForm();

  return (
    <main className="page-admin">
      <h1>Administration</h1>
      <form onSubmit={soumettre}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Mot de passe
          <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required />
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
    </main>
  );
};

const TableauDeBord = () => {
  const { signalements, chargement, erreur, idEvenementEnCours, traiter } = useModeration();
  const { deconnecter, enCours: deconnexionEnCours } = useDeconnexion();

  return (
    <main className="page-admin">
      <div className="entete-admin">
        <h1>Signalements en attente</h1>
        <button type="button" className="bouton-secondaire" onClick={() => void deconnecter()} disabled={deconnexionEnCours}>
          Se déconnecter
        </button>
      </div>

      {erreur && (
        <p role="alert" className="message-erreur">
          {erreur}
        </p>
      )}

      {chargement ? (
        <p>Chargement…</p>
      ) : signalements.length === 0 ? (
        <p>Aucun signalement en attente.</p>
      ) : (
        <ul className="liste-signalements">
          {signalements.map((signalement) => (
            <LigneSignalement
              key={`${signalement.idEvenement}-${signalement.idJoueur}-${signalement.idMotif}`}
              signalement={signalement}
              enCours={idEvenementEnCours === signalement.idEvenement}
              traiter={traiter}
            />
          ))}
        </ul>
      )}
    </main>
  );
};

type PropsLigneSignalement = {
  signalement: SignalementDetail;
  enCours: boolean;
  traiter: (idEvenement: number, action: "sanctionner" | "rejeter") => void;
};

// Une action (désactiver + avertir, ou rejeter) s'applique à tout l'événement,
// pas à une ligne de signalement isolée — plusieurs joueurs peuvent avoir signalé
// le même événement (cf. moderationService côté back).
const LigneSignalement = ({ signalement, enCours, traiter }: PropsLigneSignalement) => (
  <li className="carte-signalement">
    <strong>{signalement.evenementTitre}</strong>
    <div>Motif : {signalement.motifLibelle}</div>
    {signalement.texteLibre && <div>« {signalement.texteLibre} »</div>}
    <div className="meta-signalement">
      Signalé par le joueur #{signalement.idJoueur} le {formaterDate(signalement.dateSignalement)}
    </div>
    <div className="actions-signalement">
      <button type="button" onClick={() => traiter(signalement.idEvenement, "sanctionner")} disabled={enCours}>
        {enCours ? "…" : "Désactiver + avertir"}
      </button>
      <button
        type="button"
        className="bouton-secondaire"
        onClick={() => traiter(signalement.idEvenement, "rejeter")}
        disabled={enCours}
      >
        {enCours ? "…" : "Rejeter le signalement"}
      </button>
    </div>
  </li>
);
