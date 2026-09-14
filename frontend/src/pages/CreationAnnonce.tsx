import { Link } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { useCreationEvenementForm } from "../hooks/useCreationEvenementForm";
import { FORMATS_COURANTS, LIBELLES_NIVEAU, type NiveauRequis } from "../types/evenement";
import "../styles/creationAnnonce.css";

const NIVEAUX: NiveauRequis[] = ["tous_niveaux", "debutant", "intermediaire", "confirme"];

export const CreationAnnonce = () => {
  const { utilisateur, chargementInitial } = useAppSelector((state) => state.auth);
  const {
    adresse,
    setAdresse,
    nomLieu,
    setNomLieu,
    typeTerrain,
    setTypeTerrain,
    date,
    setDate,
    heureDebut,
    setHeureDebut,
    heureFin,
    setHeureFin,
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
    estPrive,
    setEstPrive,
    erreur,
    chargement,
    soumettre,
  } = useCreationEvenementForm();

  if (chargementInitial) return <p className="page-creation">Chargement…</p>;

  // Seul un joueur peut créer un événement (cf. CLAUDE.md, tableau des rôles) —
  // un visiteur non connecté ou un administrateur n'en a pas le droit.
  if (!utilisateur) {
    return (
      <main className="page-creation">
        <p>
          <Link to="/connexion">Connectez-vous</Link> pour créer un événement.
        </p>
      </main>
    );
  }

  if (utilisateur.role !== "joueur") {
    return (
      <main className="page-creation">
        <p>Seuls les joueurs peuvent créer un événement.</p>
      </main>
    );
  }

  const { jour, mois } = date
    ? {
        jour: new Date(`${date}T00:00`).toLocaleDateString("fr-FR", { day: "2-digit" }),
        mois: new Date(`${date}T00:00`).toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
      }
    : { jour: "—", mois: "" };

  return (
    <main className="page-creation">
      <h1>Créer une annonce</h1>
      <p className="texte-accroche">Publiez votre événement, les joueurs à proximité pourront le trouver et s'y inscrire.</p>

      <div className="mise-en-page-creation">
        <form onSubmit={soumettre}>
          <fieldset>
            <legend>
              <span className="numero-bloc">1</span> Lieu et date
            </legend>
            <label>
              Adresse du terrain
              <input
                type="text"
                placeholder="Adresse ou ville du terrain"
                value={adresse}
                onChange={(evenement) => setAdresse(evenement.target.value)}
                required
                minLength={5}
              />
            </label>
            <label>
              Nom du lieu (facultatif)
              <input type="text" value={nomLieu} onChange={(evenement) => setNomLieu(evenement.target.value)} />
            </label>
            <label>
              Type de terrain (facultatif)
              <input
                type="text"
                placeholder="Gazon, synthétique, salle…"
                value={typeTerrain}
                onChange={(evenement) => setTypeTerrain(evenement.target.value)}
              />
            </label>
            <div className="ligne-champs">
              <label>
                Date
                <input type="date" value={date} onChange={(evenement) => setDate(evenement.target.value)} required />
              </label>
              <label>
                Heure de début
                <input type="time" value={heureDebut} onChange={(evenement) => setHeureDebut(evenement.target.value)} required />
              </label>
              <label>
                Heure de fin
                <input type="time" value={heureFin} onChange={(evenement) => setHeureFin(evenement.target.value)} required />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>
              <span className="numero-bloc">2</span> Caractéristiques
            </legend>
            <label>
              Titre de l'annonce
              <input
                type="text"
                value={titre}
                onChange={(evenement) => setTitre(evenement.target.value)}
                required
                minLength={3}
                maxLength={50}
              />
            </label>
            <div className="ligne-champs">
              <label>
                Format
                <select value={format} onChange={(evenement) => setFormat(evenement.target.value)}>
                  <option value="">Non précisé</option>
                  {FORMATS_COURANTS.map((valeur) => (
                    <option key={valeur} value={valeur}>
                      {valeur}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nombre de places
                <input
                  type="number"
                  value={nombrePlaces}
                  onChange={(evenement) => setNombrePlaces(Number(evenement.target.value))}
                  min={2}
                  max={30}
                  required
                />
              </label>
              <label>
                Niveau attendu
                <select value={niveauRequis} onChange={(evenement) => setNiveauRequis(evenement.target.value as NiveauRequis)}>
                  {NIVEAUX.map((niveau) => (
                    <option key={niveau} value={niveau}>
                      {LIBELLES_NIVEAU[niveau]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Description (facultative)
              <textarea
                placeholder="Précisez le point de rendez-vous, l'équipement à prévoir, les règles particulières…"
                value={description}
                onChange={(evenement) => setDescription(evenement.target.value)}
                maxLength={1000}
                rows={4}
              />
            </label>
          </fieldset>

          <fieldset>
            <legend>
              <span className="numero-bloc">3</span> Visibilité
            </legend>
            <div className="options-visibilite">
              <label className={estPrive ? "option-visibilite" : "option-visibilite option-visibilite--choisie"}>
                <input type="radio" checked={!estPrive} onChange={() => setEstPrive(false)} />
                <span>
                  <strong>Événement public</strong>
                  <span className="texte-attenue">Visible par tous les joueurs dans le rayon de recherche.</span>
                </span>
              </label>
              <label className={estPrive ? "option-visibilite option-visibilite--choisie" : "option-visibilite"}>
                <input type="radio" checked={estPrive} onChange={() => setEstPrive(true)} />
                <span>
                  <strong>Événement privé</strong>
                  <span className="texte-attenue">Inscription libre dans la limite des places, sur validation de votre part.</span>
                </span>
              </label>
            </div>
          </fieldset>

          {erreur && (
            <p role="alert" className="message-erreur">
              {erreur}
            </p>
          )}

          <button type="submit" disabled={chargement}>
            {chargement ? "Publication…" : "Publier l'annonce"}
          </button>
        </form>

        <aside className="apercu-creation">
          <h2>Aperçu du résultat de recherche</h2>
          <div className="carte-apercu">
            <div className="date-badge">
              <strong>{jour}</strong>
              <span>{mois}</span>
            </div>
            <div className="carte-apercu-corps">
              <strong>{titre || "Titre de l'événement"}</strong>
              <div className="carte-evenement-badges">
                <span className="badge">{nombrePlaces} places</span>
                <span className="badge badge--marque">{LIBELLES_NIVEAU[niveauRequis]}</span>
                {estPrive && <span className="badge">Privé</span>}
              </div>
            </div>
          </div>

          <div className="encart-info">
            <h3>Comment fonctionne la localisation</h3>
            <p className="texte-attenue">
              L'adresse saisie est convertie en coordonnées à la publication. Elle sert ensuite à faire apparaître votre événement
              dans les recherches par rayon.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
};
