import { useState } from "react";
import { Link } from "react-router-dom";
import { useFicheEvenement } from "../hooks/useFicheEvenement";
import { useModificationEvenementForm } from "../hooks/useModificationEvenementForm";
import { evenementService } from "../services/evenementService";
import { LIBELLES_NIVEAU, type Evenement, type InscritDetail, type NiveauRequis } from "../types/evenement";
import "../styles/ficheEvenement.css";

const formaterDate = (date: string) =>
  new Date(date).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

export const FicheEvenement = () => {
  const {
    evenement,
    inscrits,
    chargement,
    erreur,
    etat,
    actionEnCours,
    rejoindre,
    seDesinscrire,
    idJoueurEnValidation,
    validerDemande,
    rafraichir,
  } = useFicheEvenement();
  const [modeEdition, setModeEdition] = useState(false);

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
  const demandesEnAttente = inscrits.filter((inscrit) => inscrit.statut === "en_attente");
  const estOrganisateur = etat === "organisateur";

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

      {modeEdition ? (
        <FormulaireModification
          evenement={evenement}
          onSuccess={() => {
            setModeEdition(false);
            void rafraichir();
          }}
          onAnnuler={() => setModeEdition(false)}
        />
      ) : (
        <>
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

          {estOrganisateur && evenement.statut !== "Termine" && (
            <button type="button" className="bouton-secondaire" onClick={() => setModeEdition(true)}>
              Modifier l'événement
            </button>
          )}
        </>
      )}

      {estOrganisateur && evenement.estPrive && demandesEnAttente.length > 0 && (
        <DemandesEnAttente
          demandes={demandesEnAttente}
          idJoueurEnValidation={idJoueurEnValidation}
          valider={validerDemande}
        />
      )}

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

const NIVEAUX: NiveauRequis[] = ["tous_niveaux", "debutant", "intermediaire", "confirme"];

type PropsFormulaireModification = {
  evenement: Evenement;
  onSuccess: () => void;
  onAnnuler: () => void;
};

// Réservé à l'organisateur (cf. BoutonInscription — visible seulement dans ce cas).
// Pas d'adresse ici : elle redéclencherait un géocodage, hors périmètre (voir
// CLAUDE.md et useModificationEvenementForm).
const FormulaireModification = ({ evenement, onSuccess, onAnnuler }: PropsFormulaireModification) => {
  const {
    titre,
    setTitre,
    description,
    setDescription,
    nombrePlaces,
    setNombrePlaces,
    niveauRequis,
    setNiveauRequis,
    date,
    setDate,
    heureDebut,
    setHeureDebut,
    heureFin,
    setHeureFin,
    erreur,
    chargement,
    soumettre,
  } = useModificationEvenementForm(evenement, onSuccess);

  return (
    <form className="formulaire-modification" onSubmit={soumettre}>
      <label>
        Titre
        <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} required minLength={3} maxLength={50} />
      </label>
      <label>
        Description
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3} />
      </label>
      <label>
        Date
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <label>
        Heure de début
        <input type="time" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} required />
      </label>
      <label>
        Heure de fin
        <input type="time" value={heureFin} onChange={(e) => setHeureFin(e.target.value)} required />
      </label>
      <label>
        Nombre de places
        <input
          type="number"
          value={nombrePlaces}
          onChange={(e) => setNombrePlaces(Number(e.target.value))}
          min={2}
          max={30}
          required
        />
      </label>
      <label>
        Niveau requis
        <select value={niveauRequis} onChange={(e) => setNiveauRequis(e.target.value as NiveauRequis)}>
          {NIVEAUX.map((niveau) => (
            <option key={niveau} value={niveau}>
              {LIBELLES_NIVEAU[niveau]}
            </option>
          ))}
        </select>
      </label>

      {erreur && (
        <p role="alert" className="message-erreur">
          {erreur}
        </p>
      )}

      <div className="actions-formulaire">
        <button type="submit" disabled={chargement}>
          {chargement ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" className="bouton-secondaire" onClick={onAnnuler} disabled={chargement}>
          Annuler
        </button>
      </div>
    </form>
  );
};

type PropsDemandesEnAttente = {
  demandes: InscritDetail[];
  idJoueurEnValidation: number | null;
  valider: (idJoueur: number, accepter: boolean) => void;
};

// Événement privé, vu par l'organisateur : les demandes en attente de validation
// (cf. CLAUDE.md, section 6 — seul l'organisateur peut accepter/refuser).
const DemandesEnAttente = ({ demandes, idJoueurEnValidation, valider }: PropsDemandesEnAttente) => (
  <section aria-label="Demandes en attente" className="demandes-attente">
    <h2>Demandes en attente ({demandes.length})</h2>
    <ul className="liste-inscrits">
      {demandes.map((demande) => {
        const enCours = idJoueurEnValidation === demande.idJoueur;
        return (
          <li key={demande.idJoueur} className="ligne-demande">
            <span>
              {demande.prenom} {demande.nom}
            </span>
            <span className="actions-demande">
              <button type="button" onClick={() => valider(demande.idJoueur, true)} disabled={enCours}>
                {enCours ? "…" : "Accepter"}
              </button>
              <button type="button" className="bouton-secondaire" onClick={() => valider(demande.idJoueur, false)} disabled={enCours}>
                {enCours ? "…" : "Refuser"}
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  </section>
);
