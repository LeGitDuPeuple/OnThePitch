import { useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useFicheEvenement } from "../hooks/useFicheEvenement";
import { useModificationEvenementForm } from "../hooks/useModificationEvenementForm";
import { useQrPresence } from "../hooks/useQrPresence";
import { useScannerPresence } from "../hooks/useScannerPresence";
import { useMessageConfirmation } from "../hooks/useMessageConfirmation";
import { useSignalement } from "../hooks/useSignalement";
import { useEvaluation } from "../hooks/useEvaluation";
import { evenementService } from "../services/evenementService";
import { useAppSelector } from "../store/hooks";
import { CarteInteractive } from "../components/CarteInteractive";
import { Avatar } from "../components/Avatar";
import { ErreurChamp } from "../components/ErreurChamp";
import { MessageConfirmation } from "../components/MessageConfirmation";
import {
  FORMATS_COURANTS,
  LIBELLES_NIVEAU,
  type Evenement,
  type InscritDetail,
  type NiveauRequis,
  type PresenceReponse,
} from "../types/evenement";
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
    peutEvaluer,
    actionEnCours,
    rejoindre,
    seDesinscrire,
    annulerEvenement,
    terminerEvenement,
    idJoueurEnValidation,
    validerDemande,
    idJoueurEnMarquage,
    marquerPresent,
    apresScan,
    rafraichir,
  } = useFicheEvenement();
  const [modeEdition, setModeEdition] = useState(false);
  // Confirmation en deux temps avant l'annulation (destructive) — pas de
  // window.confirm() natif, pour rester cohérent avec le reste de l'appli.
  const [confirmationAnnulation, setConfirmationAnnulation] = useState(false);
  const [confirmationFin, setConfirmationFin] = useState(false);
  // Avertissement post-création si la photo du lieu n'a pas pu être déposée
  // (voir useCreationEvenementForm.soumettre) — récupérable ici, voir PhotoLieu.
  const { message: messageConfirmation, type: typeMessageConfirmation, effacer: effacerMessageConfirmation } = useMessageConfirmation();
  const utilisateur = useAppSelector((state) => state.auth.utilisateur);

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
  // Identité, pas `etat === "organisateur"` : cet état retombe sur "termine"
  // une fois l'événement clos, pour tout le monde (organisateur inclus) — un
  // test basé dessus aurait fait réapparaître "Signaler" pour l'organisateur
  // lui-même sur son propre événement terminé (bug trouvé en testant le
  // 19/09/2026). Les boutons d'action organisateur restent par ailleurs tous
  // gardés par `evenement.statut !== "Termine"`, indépendamment de ceci.
  const estOrganisateur = utilisateur?.id === evenement.idOrganisateur;
  // Nombre de présents pointés (scan QR ou marquage manuel) — affiché à titre
  // indicatif au moment de terminer l'événement, jamais une condition
  // bloquante (revu le 20/09/2026 : un absent ne doit pas empêcher de clôturer).
  const presentsCount = inscritsAcceptes.filter((inscrit) => inscrit.presence !== null).length;
  const placesOccupees = evenement.nombrePlaces - evenement.placesRestantes;
  const pourcentageRempli = Math.round((placesOccupees / evenement.nombrePlaces) * 100);

  return (
    <main className="page-fiche">
      <Link to="/" className="lien-retour">
        ← Retour aux résultats
      </Link>

      <MessageConfirmation message={messageConfirmation} type={typeMessageConfirmation} onFermer={effacerMessageConfirmation} />

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
            <PhotoLieu idEvenement={evenement.id} nomLieu={evenement.lieu.nom} aUnePhoto={evenement.lieu.aUnePhoto} estOrganisateur={estOrganisateur} />

            <div className="badges-fiche">
              <span className="badge">{evenement.estPrive ? "Événement privé" : "Événement public"}</span>
              <span className="badge badge--marque">{LIBELLES_NIVEAU[evenement.niveauRequis]}</span>
              {evenement.statut === "Termine" && <span className="badge badge--info">Terminé</span>}
            </div>

            <h1>{evenement.titre}</h1>

            <div className="organisateur-fiche">
              <Avatar nom={evenement.organisateur.nom} prenom={evenement.organisateur.prenom} />
              <span>
                Organisé par {evenement.organisateur.prenom} {evenement.organisateur.nom}
              </span>
              {evenement.organisateur.fiabilite !== null && (
                <span className="pastille-fiabilite">★ {evenement.organisateur.fiabilite.toFixed(1)}/5</span>
              )}
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

            {/* Réservé à un joueur connecté, pas à l'organisateur lui-même
                (verifierRole("joueur") revérifie côté back de toute façon —
                voir CLAUDE.md section 8). */}
            {utilisateur?.role === "joueur" && !estOrganisateur && <Signalement idEvenement={evenement.id} />}

            {peutEvaluer && <Evaluation idEvenement={evenement.id} />}

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

              {/* Scan de présence — organisateur, jour de l'événement seulement
                  (même règle que le QR généré côté joueur : un jeton ne peut
                  de toute façon exister en dehors de cette fenêtre). */}
              {estOrganisateur && estAujourdhui(evenement.dateDebut) && (
                <ScannerPresence idEvenement={evenement.id} onSucces={apresScan} />
              )}

              {/* Toujours disponible pour l'organisateur, jamais bloqué par les
                  présences (revu le 20/09/2026 — un simple absent aurait sinon
                  empêché de clôturer l'événement pour toujours). Le nombre de
                  présents n'est qu'une information, affichée au moment de
                  confirmer, jamais une condition. */}
              {estOrganisateur && evenement.statut !== "Termine" && (
                <div className="bloc-fin-evenement">
                  {confirmationFin ? (
                    <>
                      <p className="texte-attenue">
                        {inscritsAcceptes.length > 0 && presentsCount < inscritsAcceptes.length
                          ? `${presentsCount} joueur(s) sur ${inscritsAcceptes.length} marqué(s) présent(s) — les autres seront considérés absents. `
                          : ""}
                        L'événement ne sera plus modifiable ensuite. Confirmer ?
                      </p>
                      <div className="actions-formulaire">
                        <button type="button" onClick={terminerEvenement} disabled={actionEnCours}>
                          {actionEnCours ? "…" : "Oui, terminer l'événement"}
                        </button>
                        <button
                          type="button"
                          className="bouton-secondaire"
                          onClick={() => setConfirmationFin(false)}
                          disabled={actionEnCours}
                        >
                          Non
                        </button>
                      </div>
                    </>
                  ) : (
                    <button type="button" className="bouton-secondaire" onClick={() => setConfirmationFin(true)}>
                      Terminer l'événement
                    </button>
                  )}
                </div>
              )}

              {estOrganisateur && evenement.statut !== "Termine" && (
                <div className="bloc-annulation">
                  {confirmationAnnulation ? (
                    <>
                      <p className="texte-attenue">
                        Les joueurs inscrits ne seront plus prévenus autrement que par la disparition de l'événement. Confirmer ?
                      </p>
                      <div className="actions-formulaire">
                        <button type="button" className="bouton-danger" onClick={annulerEvenement} disabled={actionEnCours}>
                          {actionEnCours ? "…" : "Oui, annuler l'événement"}
                        </button>
                        <button
                          type="button"
                          className="bouton-secondaire"
                          onClick={() => setConfirmationAnnulation(false)}
                          disabled={actionEnCours}
                        >
                          Non
                        </button>
                      </div>
                    </>
                  ) : (
                    <button type="button" className="bouton-danger" onClick={() => setConfirmationAnnulation(true)}>
                      Annuler l'événement
                    </button>
                  )}
                </div>
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
                  <li key={inscrit.idJoueur} className="ligne-demande">
                    <span className="ligne-demande-identite">
                      <Avatar nom={inscrit.nom} prenom={inscrit.prenom} />
                      <span>
                        {inscrit.prenom} {inscrit.nom}
                      </span>
                    </span>
                    {/* Marquage manuel — secours du scan QR (caméra en panne,
                        joueur sans téléphone...). Organisateur, jour J seulement,
                        même fenêtre que le scan et la génération du QR. */}
                    {estOrganisateur && estAujourdhui(evenement.dateDebut) && (
                      <span>
                        {inscrit.presence ? (
                          <span className="badge badge--marque">Présent</span>
                        ) : (
                          <button
                            type="button"
                            className="bouton-secondaire"
                            onClick={() => marquerPresent(inscrit.idJoueur)}
                            disabled={idJoueurEnMarquage === inscrit.idJoueur}
                          >
                            {idJoueurEnMarquage === inscrit.idJoueur ? "…" : "Marquer présent"}
                          </button>
                        )}
                      </span>
                    )}
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

type PropsSignalement = {
  idEvenement: number;
};

// "Signaler un problème sur cette annonce" (maquette) — manquait la route
// listant les motifs côté back (voir GET /moderation/motifs, CLAUDE.md
// section "Front React", écart désormais comblé le 19/09/2026).
const Signalement = ({ idEvenement }: PropsSignalement) => {
  const { motifs, chargementMotifs, envoiEnCours, erreur, envoye, signaler } = useSignalement(idEvenement);
  const [ouvert, setOuvert] = useState(false);
  const [idMotif, setIdMotif] = useState<number | "">("");
  const [texteLibre, setTexteLibre] = useState("");

  if (envoye) {
    return <p className="texte-attenue">Signalement envoyé, merci — un administrateur va l'examiner.</p>;
  }

  if (!ouvert) {
    return (
      <button type="button" className="bouton-secondaire" onClick={() => setOuvert(true)}>
        Signaler un problème sur cette annonce
      </button>
    );
  }

  return (
    <form
      className="bloc-signalement"
      onSubmit={(evenementForm) => {
        evenementForm.preventDefault();
        if (idMotif !== "") void signaler(idMotif, texteLibre.trim() || undefined);
      }}
    >
      <label>
        Motif
        <select
          value={idMotif}
          onChange={(evenementChange) => setIdMotif(Number(evenementChange.target.value))}
          required
          disabled={chargementMotifs || envoiEnCours}
        >
          <option value="" disabled>
            Choisissez un motif
          </option>
          {motifs.map((motif) => (
            <option key={motif.id} value={motif.id}>
              {motif.libelle}
            </option>
          ))}
        </select>
      </label>
      <label>
        Précisions (facultatif)
        <textarea
          value={texteLibre}
          onChange={(evenementChange) => setTexteLibre(evenementChange.target.value)}
          maxLength={255}
          rows={2}
          disabled={envoiEnCours}
        />
      </label>

      {erreur && (
        <p role="alert" className="message-erreur">
          {erreur}
        </p>
      )}

      <div className="actions-formulaire">
        <button type="submit" disabled={envoiEnCours || idMotif === ""}>
          {envoiEnCours ? "Envoi…" : "Envoyer le signalement"}
        </button>
        <button type="button" className="bouton-secondaire" onClick={() => setOuvert(false)} disabled={envoiEnCours}>
          Annuler
        </button>
      </div>
    </form>
  );
};

type PropsEvaluation = {
  idEvenement: number;
};

// "Évaluer l'organisateur" — un joueur accepté note l'organisateur une fois
// l'événement terminé (voir CLAUDE.md, "Évolutions envisagées" — système
// d'évaluation, résolu le 23/09/2026). Éligibilité déjà vérifiée par
// useFicheEvenement.peutEvaluer avant l'affichage de ce composant.
const Evaluation = ({ idEvenement }: PropsEvaluation) => {
  const { envoiEnCours, erreur, envoyee, noter } = useEvaluation(idEvenement);
  const [ouvert, setOuvert] = useState(false);
  const [note, setNote] = useState<number | "">("");
  const [commentaire, setCommentaire] = useState("");

  if (envoyee) {
    return <p className="texte-attenue">Merci, votre évaluation a été enregistrée.</p>;
  }

  if (!ouvert) {
    return (
      <button type="button" className="bouton-secondaire" onClick={() => setOuvert(true)}>
        Évaluer l'organisateur
      </button>
    );
  }

  return (
    <form
      className="bloc-signalement"
      onSubmit={(evenementForm) => {
        evenementForm.preventDefault();
        if (note !== "") void noter(note, commentaire.trim() || undefined);
      }}
    >
      <label>
        Note
        <select
          value={note}
          onChange={(evenementChange) => setNote(Number(evenementChange.target.value))}
          required
          disabled={envoiEnCours}
        >
          <option value="" disabled>
            Choisissez une note
          </option>
          {[1, 2, 3, 4, 5].map((valeur) => (
            <option key={valeur} value={valeur}>
              {valeur}/5
            </option>
          ))}
        </select>
      </label>
      <label>
        Commentaire (facultatif)
        <textarea
          value={commentaire}
          onChange={(evenementChange) => setCommentaire(evenementChange.target.value)}
          maxLength={255}
          rows={2}
          disabled={envoiEnCours}
        />
      </label>

      {erreur && (
        <p role="alert" className="message-erreur">
          {erreur}
        </p>
      )}

      <div className="actions-formulaire">
        <button type="submit" disabled={envoiEnCours || note === ""}>
          {envoiEnCours ? "Envoi…" : "Envoyer l'évaluation"}
        </button>
        <button type="button" className="bouton-secondaire" onClick={() => setOuvert(false)} disabled={envoiEnCours}>
          Annuler
        </button>
      </div>
    </form>
  );
};

type PropsPhotoLieu = {
  idEvenement: number;
  nomLieu: string | null;
  aUnePhoto: boolean;
  estOrganisateur: boolean;
};

// Affiche la photo du lieu si elle existe. Pour l'organisateur, permet aussi
// de la déposer ou la remplacer sans repasser par la modification de l'événement
// (chemin de récupération si l'envoi avait échoué à la création — voir
// useCreationEvenementForm.soumettre — et confort au-delà de ce cas).
const PhotoLieu = ({ idEvenement, nomLieu, aUnePhoto, estOrganisateur }: PropsPhotoLieu) => {
  const [enEdition, setEnEdition] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Change à chaque dépôt réussi pour invalider le cache navigateur de l'<img>
  // (même URL sinon — voir evenementService.urlPhoto).
  const [version, setVersion] = useState(0);

  const televerser = async (fichier: File) => {
    setChargement(true);
    setErreur(null);
    try {
      await evenementService.televerserPhoto(idEvenement, fichier);
      setVersion((precedente) => precedente + 1);
      setEnEdition(false);
    } catch {
      setErreur("La photo n'a pas pu être enregistrée (2 Mo max, jpeg/png/webp).");
    } finally {
      setChargement(false);
    }
  };

  const photoActuelle = (aUnePhoto || version > 0) && (
    <img className="photo-lieu" src={`${evenementService.urlPhoto(idEvenement)}?v=${version}`} alt={nomLieu ?? "Lieu de l'événement"} />
  );

  if (!estOrganisateur) return photoActuelle || null;

  return (
    <div className="bloc-photo-lieu">
      {photoActuelle}
      {enEdition ? (
        <div className="edition-photo-lieu">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={chargement}
            onChange={(evenement) => {
              const fichier = evenement.target.files?.[0];
              if (fichier) void televerser(fichier);
            }}
          />
          <button type="button" className="bouton-secondaire" onClick={() => setEnEdition(false)} disabled={chargement}>
            Annuler
          </button>
          {chargement && <span className="texte-attenue">Envoi…</span>}
          {erreur && (
            <p role="alert" className="message-erreur">
              {erreur}
            </p>
          )}
        </div>
      ) : (
        <button type="button" className="bouton-secondaire" onClick={() => setEnEdition(true)}>
          {aUnePhoto || version > 0 ? "Remplacer la photo du lieu" : "Ajouter une photo du lieu"}
        </button>
      )}
    </div>
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
    case "refuse":
      return <p className="info-organisateur">Votre demande pour rejoindre cet événement a été refusée par l'organisateur.</p>;
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
    erreursChamps,
    chargement,
    soumettre,
  } = useModificationEvenementForm(evenement, onSuccess);

  return (
    <form className="formulaire-modification" onSubmit={soumettre}>
      <h1>Modifier l'événement</h1>
      <label>
        Titre
        <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} required minLength={3} maxLength={50} />
        <ErreurChamp message={erreursChamps.titre} />
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
        <ErreurChamp message={erreursChamps.date} />
      </label>
      <label>
        Heure de début
        <input type="time" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} required />
      </label>
      <label>
        Heure de fin
        <input type="time" value={heureFin} onChange={(e) => setHeureFin(e.target.value)} required />
        <ErreurChamp message={erreursChamps.heureFin} />
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
        <ErreurChamp message={erreursChamps.nombrePlaces} />
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

      {erreur && Object.keys(erreursChamps).length === 0 && (
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

type PropsScannerPresence = {
  idEvenement: number;
  onSucces: (reponse: PresenceReponse) => void;
};

// Pendant du QrPresence, côté organisateur : ouvre la caméra et scanne en
// continu (plusieurs joueurs à la suite sans rouvrir l'écran à chaque fois).
// html5-qrcode gère lui-même le flux vidéo dans le conteneur ciblé par id
// (voir useScannerPresence) — le composant ne fait qu'afficher son état.
const ScannerPresence = ({ idEvenement, onSucces }: PropsScannerPresence) => {
  const { actif, erreur, demarrer, arreter, idConteneur } = useScannerPresence(idEvenement, onSucces);

  if (!actif) {
    return (
      <button type="button" className="bouton-secondaire" onClick={demarrer}>
        Scanner un QR de présence
      </button>
    );
  }

  return (
    <div className="bloc-scanner-presence">
      <div id={idConteneur} className="lecteur-qr" />
      <p className="texte-attenue">Pointez la caméra vers le QR affiché par le joueur.</p>
      {erreur && (
        <p role="alert" className="message-erreur">
          {erreur}
        </p>
      )}
      <button type="button" className="bouton-secondaire" onClick={arreter}>
        Arrêter le scan
      </button>
    </div>
  );
};
