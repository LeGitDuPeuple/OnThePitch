import { useAppSelector } from "../store/hooks";
import { useAdminConnexionForm } from "../hooks/useAdminConnexionForm";
import { FormulaireCodeDoubleAuth } from "../components/FormulaireCodeDoubleAuth";
import { useModeration } from "../hooks/useModeration";
import { useEvenementsAdmin } from "../hooks/useEvenementsAdmin";
import { useDeconnexion } from "../hooks/useDeconnexion";
import type { SignalementDetail, EvenementAdmin } from "../types/moderation";
import type { StatutEvenement } from "../types/evenement";
import "../styles/admin.css";
import { TitrePage } from "../components/TitrePage";

const formaterDate = (date: string) =>
  new Date(date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

const LIBELLES_STATUT: Record<StatutEvenement, string> = {
  Ouvert: "Ouvert",
  Complet: "Complet",
  Termine: "Terminé",
  Annule: "Annulé",
};

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
<TitrePage titre={"Administration"} description={"Espace de modération réservé aux administrateurs."} indexable={false} />
        <p>Ce tableau de bord est réservé aux administrateurs.</p>
      </main>
    );
  }

  return <TableauDeBord />;
};

const ConnexionAdmin = () => {
  const { email, setEmail, motDePasse, setMotDePasse, erreur, chargement, soumettre, doubleAuth } = useAdminConnexionForm();

  return (
    <main className="page-admin">
<TitrePage titre={"Administration"} description={"Espace de modération réservé aux administrateurs."} indexable={false} />
      <h1>Administration</h1>
      {doubleAuth.codeRequis ? (
        <FormulaireCodeDoubleAuth {...doubleAuth} />
      ) : (
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
      )}
    </main>
  );
};

const TableauDeBord = () => {
  const { signalements, statistiques, chargement, erreur, idEvenementEnCours, traiter } = useModeration();
  const {
    statut,
    setStatut,
    dateDebutMin,
    setDateDebutMin,
    dateDebutMax,
    setDateDebutMax,
    evenements,
    chargement: chargementEvenements,
    erreur: erreurEvenements,
  } = useEvenementsAdmin();
  const { deconnecter, enCours: deconnexionEnCours } = useDeconnexion();

  return (
    <main className="page-admin">
<TitrePage titre={"Administration"} description={"Espace de modération réservé aux administrateurs."} indexable={false} />
      <div className="entete-admin">
        <h1>Tableau de bord</h1>
        <button type="button" className="bouton-secondaire" onClick={() => void deconnecter()} disabled={deconnexionEnCours}>
          Se déconnecter
        </button>
      </div>

      {statistiques && (
        <div className="statistiques-admin">
          <div className="tuile-statistique">
            <strong>{statistiques.totalEvenements}</strong>
            <span>Événements créés</span>
          </div>
          <div className="tuile-statistique">
            <strong>{statistiques.evenementsActifs}</strong>
            <span>Événements actifs</span>
          </div>
          <div className="tuile-statistique">
            <strong>{statistiques.evenementsTermines}</strong>
            <span>Événements terminés</span>
          </div>
          <div className="tuile-statistique">
            <strong>{statistiques.totalJoueurs}</strong>
            <span>Joueurs inscrits</span>
          </div>
        </div>
      )}

      {erreur && (
        <p role="alert" className="message-erreur">
          {erreur}
        </p>
      )}

      <h2>Signalements en attente</h2>

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

      <h2>Tous les événements</h2>

      <div className="filtres-evenements-admin">
        <label>
          Statut
          <select value={statut} onChange={(e) => setStatut(e.target.value as StatutEvenement | "")}>
            <option value="">Tous</option>
            <option value="Ouvert">Ouvert</option>
            <option value="Complet">Complet</option>
            <option value="Termine">Terminé</option>
            <option value="Annule">Annulé</option>
          </select>
        </label>
        <label>
          Du
          <input type="date" value={dateDebutMin} onChange={(e) => setDateDebutMin(e.target.value)} />
        </label>
        <label>
          Au
          <input type="date" value={dateDebutMax} onChange={(e) => setDateDebutMax(e.target.value)} />
        </label>
      </div>

      {erreurEvenements && (
        <p role="alert" className="message-erreur">
          {erreurEvenements}
        </p>
      )}

      {chargementEvenements ? (
        <p>Chargement…</p>
      ) : evenements.length === 0 ? (
        <p>Aucun événement ne correspond à ces filtres.</p>
      ) : (
        <ul className="liste-evenements-admin">
          {evenements.map((evenement) => (
            <LigneEvenementAdmin key={evenement.id} evenement={evenement} />
          ))}
        </ul>
      )}
    </main>
  );
};

// Même code couleur que le reste de l'appli (CarteRecherche, FicheEvenement) :
// Ouvert en vert, Complet en rouge (bloquant), Terminé en bleu, Annulé en
// ambre. Une couleur à part par statut — revu le 22/09/2026 (retour du porteur
// de projet : le badge neutre/estompé passait inaperçu à côté des autres sur
// cette liste à plusieurs statuts, voir CLAUDE.md).
const classeBadgeStatut = (evenement: EvenementAdmin): string => {
  if (evenement.estAnnule) return "badge badge--ambre";
  if (evenement.statut === "Termine") return "badge badge--info";
  if (evenement.statut === "Complet") return "badge badge--alerte";
  return "badge badge--marque";
};

const LigneEvenementAdmin = ({ evenement }: { evenement: EvenementAdmin }) => (
  <li className="ligne-evenement-admin">
    <strong>{evenement.titre}</strong>
    <span className={classeBadgeStatut(evenement)}>{evenement.estAnnule ? "Annulé" : LIBELLES_STATUT[evenement.statut]}</span>
    <div className="texte-attenue">
      Organisé par {evenement.organisateur.prenom} {evenement.organisateur.nom} · {formaterDate(evenement.dateDebut)}
    </div>
  </li>
);

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
