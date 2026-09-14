import { useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useFicheEvenement } from "../hooks/useFicheEvenement";
import { useModificationEvenementForm } from "../hooks/useModificationEvenementForm";
import { useQrPresence } from "../hooks/useQrPresence";
import { evenementService } from "../services/evenementService";
import { CarteInteractive } from "../components/CarteInteractive";
import { Avatar } from "../components/Avatar";
import { FORMATS_COURANTS, LIBELLES_NIVEAU, type Evenement, type InscritDetail, type NiveauRequis } from "../types/evenement";
import "../styles/ficheEvenement.css";

const formaterDateLongue = (date: string) =>
  new Date(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const formaterHeure = (date: string) => new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const formaterDelai = (date: string) => {
  const jours = Math.round((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (jours <= 0) return "Aujourd'hui";
  if (jours === 1) return "Demain";
  return `Dans ${jours} jours`;
};

const formaterDuree = (debut: string, fin: string) => {
  const minutes = Math.round((new Date(fin).getTime() - new Date(debut).getTime()) / 60000);
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return reste === 0 ? `${heures} h de jeu` : `${heures} h ${reste} de jeu`;
};

// Même méthode que le back (comparaison de la date au format ISO, voir
// PresenceService.estAujourdhui côté serveur) : évite de proposer un bouton qui
// échouerait systématiquement en dehors du jour de l'événement.
const estAujourdhui = (date: string) => new Date(date).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);

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
  const placesOccupees = evenement.nombrePlaces - evenement.placesRestantes;
  const pourcentageRempli = Math.round((placesOccupees / evenement.nombrePlaces) * 100);

  return (
    <main className="page-fiche">
      <Link to="/" className="lien-retour">
        ← Retour aux résultats
      </Link>

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
        <div className="mise-en-page-fiche">
          <div className="contenu-fiche">
            {evenement.lieu.aUnePhoto && (
              <img
                className="photo-lieu"
                src={evenementService.urlPhoto(evenement.id)}
                alt={evenement.lieu.nom ?? "Lieu de l'événement"}
              />
            )}

            <div className="badges-fiche">
              <span className="badge">{evenement.estPrive ? "Événement privé" : "Événement public"}</span>
              <span className="badge badge--marque">{LIBELLES_NIVEAU[evenement.niveauRequis]}</span>
              {evenement.statut === "Termine" && <span className="badge">Terminé</span>}
            </div>

            <h1>{evenement.titre}</h1>

            <div className="organisateur-fiche">
              <Avatar nom={evenement.organisateur.nom} prenom={evenement.organisateur.prenom} />
              <span>
                Organisé par {evenement.organisateur.prenom} {evenement.organisateur.nom}
              </span>
            </div>

            <div className="infos-fiche">
              <div>
                <span className="libelle-info">Date</span>
                <strong>{formaterDateLongue(evenement.dateDebut)}</strong>
                <span className="texte-attenue">{formaterDelai(evenement.dateDebut)}</span>
              </div>
              <div>
                <span className="libelle-info">Horaire</span>
                <strong>
                  {formaterHeure(evenement.dateDebut)} — {formaterHeure(evenement.dateFin)}
                </strong>
                <span className="texte-attenue">{formaterDuree(evenement.dateDebut, evenement.dateFin)}</span>
              </div>
              <div>
                <span className="libelle-info">Format</span>
                <strong>{evenement.format ?? "Non précisé"}</strong>
                {evenement.lieu.typeTerrain && <span className="texte-attenue">{evenement.lieu.typeTerrain}</span>}
              </div>
            </div>

            {evenement.description && (
              <section>
                <h2>Description</h2>
                <p className="description-evenement">{evenement.description}</p>
              </section>
            )}

            <section>
              <h2>Lieu</h2>
              <CarteInteractive latitude={evenement.lieu.latitude} longitude={evenement.lieu.longitude} hauteur={220} />
              <p className="adresse-lieu">
                {evenement.lieu.nom && <>{evenement.lieu.nom} — </>}
                {evenement.lieu.adresse}, {evenement.lieu.ville}
              </p>
            </section>

            {erreur && (
              <p role="alert" className="message-erreur">
                {erreur}
              </p>
            )}

            {estOrganisateur && evenement.estPrive && demandesEnAttente.length > 0 && (
              <DemandesEnAttente demandes={demandesEnAttente} idJoueurEnValidation={idJoueurEnValidation} valider={validerDemande} />
            )}
          </div>

          <aside className="barre-laterale-fiche">
            <div className="carte-places">
              <div className="places-chiffre">
                <strong>{evenement.placesRestantes}</strong> places restantes sur {evenement.nombrePlaces}
              </div>
              <div className="barre-progression">
                <div style={{ width: `${pourcentageRempli}%` }} />
              </div>
              <div className="texte-attenue">{inscritsAcceptes.length} joueur(s) inscrit(s)</div>

              <BoutonInscription etat={etat} actionEnCours={actionEnCours} rejoindre={rejoindre} seDesinscrire={seDesinscrire} />

              {etat === "inscrit" && <QrPresence idEvenement={evenement.id} dateDebut={evenement.dateDebut} />}

              {estOrganisateur && evenement.statut !== "Termine" && (
                <button type="button" className="bouton-secondaire" onClick={() => setModeEdition(true)}>
                  Modifier l'événement
                </button>
              )}
            </div>

            <div className="carte-joueurs">
              <div className="entete-carte-joueurs">
                <h2>Joueurs inscrits</h2>
                <span className="texte-attenue">
                  {inscritsAcceptes.length}/{evenement.nombrePlaces}
                </span>
              </div>
              <ul className="liste-inscrits">
                {inscritsAcceptes.map((inscrit) => (
                  <li key={inscrit.idJoueur}>
                    <Avatar nom={inscrit.nom} prenom={inscrit.prenom} />
                    <span>
                      {inscrit.prenom} {inscrit.nom}
                    </span>
                  </li>
                ))}
                {inscritsAcceptes.length === 0 && <li className="texte-attenue">Aucun joueur inscrit pour l'instant.</li>}
              </ul>
            </div>
          </aside>
        </div>
      )}
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
        <button type="button" className="bouton-secondaire" onClick={seDesinscrire} disabled={actionEnCours}>
          {actionEnCours ? "…" : "Annuler ma demande"}
        </button>
      );
    case "inscrit":
      return (
        <button type="button" className="bouton-secondaire" onClick={seDesinscrire} disabled={actionEnCours}>
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
          {actionEnCours ? "…" : "S'inscrire à cet événement"}
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
    format,
    setFormat,
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
      <h1>Modifier l'événement</h1>
      <label>
        Titre
        <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} required minLength={3} maxLength={50} />
      </label>
      <label>
        Format
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="">Non précisé</option>
          {FORMATS_COURANTS.map((valeur) => (
            <option key={valeur} value={valeur}>
              {valeur}
            </option>
          ))}
        </select>
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
            <span className="ligne-demande-identite">
              <Avatar nom={demande.nom} prenom={demande.prenom} />
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

type PropsQrPresence = {
  idEvenement: number;
  dateDebut: string;
};

// Le joueur affiche son QR, l'organisateur le scanne (cf. CLAUDE.md section 7 —
// choix retenu pour que l'organisateur constate visuellement chaque présence).
// Le jeton n'est demandé qu'au clic, jamais préchargé : inutile tant que le
// joueur ne veut pas afficher son QR, et de toute façon refusé par le serveur
// en dehors du jour de l'événement.
const QrPresence = ({ idEvenement, dateDebut }: PropsQrPresence) => {
  const { jeton, chargement, erreur, afficher, masquer } = useQrPresence(idEvenement);

  if (!estAujourdhui(dateDebut)) {
    return <p className="info-organisateur">Votre QR de présence sera disponible le jour de l'événement.</p>;
  }

  if (jeton) {
    return (
      <div className="bloc-qr-presence">
        <QRCodeSVG value={jeton} size={180} />
        <p className="texte-attenue">Présentez ce QR à l'organisateur pour être marqué présent.</p>
        <button type="button" className="bouton-secondaire" onClick={masquer}>
          Masquer
        </button>
      </div>
    );
  }

  return (
    <div className="bloc-qr-presence">
      <button type="button" className="bouton-secondaire" onClick={afficher} disabled={chargement}>
        {chargement ? "…" : "Afficher mon QR de présence"}
      </button>
      {erreur && (
        <p role="alert" className="message-erreur">
          {erreur}
        </p>
      )}
    </div>
  );
};
