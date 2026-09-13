import { Link } from "react-router-dom";
import { useFicheEvenement } from "../hooks/useFicheEvenement";
import { evenementService } from "../services/evenementService";
import { LIBELLES_NIVEAU } from "../types/evenement";
import "../styles/ficheEvenement.css";

const formaterDate = (date: string) =>
  new Date(date).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

export const FicheEvenement = () => {
  const { evenement, inscrits, chargement, erreur, etat, actionEnCours, rejoindre, seDesinscrire } =
    useFicheEvenement();

  if (chargement) return <p className="page-fiche">Chargement…</p>;

  if (!evenement) {
    return (
      <main className="page-fiche">
        <p role="alert" className="message-erreur">
          {erreur ?? "Événement introuvable"}
        </p>
        <Link to="/">Retour à la recherche</Link>
      </main>
    );
  }

  const inscritsAcceptes = inscrits.filter((inscrit) => inscrit.statut === "acceptee");

  return (
    <main className="page-fiche">
      <Link to="/">&larr; Retour à la recherche</Link>

      {evenement.lieu.aUnePhoto && (
        <img className="photo-lieu" src={evenementService.urlPhoto(evenement.id)} alt={evenement.lieu.nom ?? "Lieu de l'événement"} />
      )}

      <h1>
        {evenement.titre}
        {evenement.estPrive && <span className="badge-prive">privé</span>}
      </h1>

      <dl className="details-evenement">
        <dt>Date</dt>
        <dd>{formaterDate(evenement.dateDebut)}</dd>

        <dt>Lieu</dt>
        <dd>
          {evenement.lieu.nom && <>{evenement.lieu.nom} — </>}
          {evenement.lieu.adresse}, {evenement.lieu.ville}
        </dd>

        <dt>Niveau requis</dt>
        <dd>{LIBELLES_NIVEAU[evenement.niveauRequis]}</dd>

        <dt>Places</dt>
        <dd>
          {evenement.placesRestantes} / {evenement.nombrePlaces} restantes — statut : {evenement.statut}
        </dd>
      </dl>

      {evenement.description && <p className="description-evenement">{evenement.description}</p>}

      {erreur && (
        <p role="alert" className="message-erreur">
          {erreur}
        </p>
      )}

      <BoutonInscription etat={etat} actionEnCours={actionEnCours} rejoindre={rejoindre} seDesinscrire={seDesinscrire} />

      <section aria-label="Inscrits">
        <h2>Inscrits ({inscritsAcceptes.length})</h2>
        <ul className="liste-inscrits">
          {inscritsAcceptes.map((inscrit) => (
            <li key={inscrit.idJoueur}>
              {inscrit.prenom} {inscrit.nom}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
};

type PropsBoutonInscription = {
  etat: ReturnType<typeof useFicheEvenement>["etat"];
  actionEnCours: boolean;
  rejoindre: () => void;
  seDesinscrire: () => void;
};

// Un seul bouton, dont le libellé et l'action changent avec l'état — pas de
// raisonnement dans le composant parent (voir CLAUDE.md, "Front React").
const BoutonInscription = ({ etat, actionEnCours, rejoindre, seDesinscrire }: PropsBoutonInscription) => {
  switch (etat) {
    case "non_connecte":
      return (
        <p>
          <Link to="/connexion">Connectez-vous</Link> pour rejoindre cet événement.
        </p>
      );
    case "organisateur":
      return <p className="info-organisateur">Vous organisez cet événement.</p>;
    case "termine":
      return null;
    case "complet":
      return (
        <button type="button" disabled>
          Complet
        </button>
      );
    case "en_attente":
      return (
        <button type="button" onClick={seDesinscrire} disabled={actionEnCours}>
          {actionEnCours ? "…" : "Annuler ma demande"}
        </button>
      );
    case "inscrit":
      return (
        <button type="button" onClick={seDesinscrire} disabled={actionEnCours}>
          {actionEnCours ? "…" : "Se désinscrire"}
        </button>
      );
    case "demande_possible":
      return (
        <button type="button" onClick={rejoindre} disabled={actionEnCours}>
          {actionEnCours ? "…" : "Demander à rejoindre"}
        </button>
      );
    case "inscription_possible":
      return (
        <button type="button" onClick={rejoindre} disabled={actionEnCours}>
          {actionEnCours ? "…" : "Rejoindre"}
        </button>
      );
  }
};
