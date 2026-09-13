import { Link } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { useCreationEvenementForm } from "../hooks/useCreationEvenementForm";
import { LIBELLES_NIVEAU, type NiveauRequis } from "../types/evenement";
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

  return (
    <main className="page-creation">
      <h1>Créer un événement</h1>
      <form onSubmit={soumettre}>
        <fieldset>
          <legend>Lieu et date</legend>
          <label>
            Adresse
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
          <label>
            Date
            <input type="date" value={date} onChange={(evenement) => setDate(evenement.target.value)} required />
          </label>
          <label>
            Heure de début
            <input
              type="time"
              value={heureDebut}
              onChange={(evenement) => setHeureDebut(evenement.target.value)}
              required
            />
          </label>
          <label>
            Heure de fin
            <input type="time" value={heureFin} onChange={(evenement) => setHeureFin(evenement.target.value)} required />
          </label>
        </fieldset>

        <fieldset>
          <legend>Caractéristiques</legend>
          <label>
            Titre
            <input
              type="text"
              value={titre}
              onChange={(evenement) => setTitre(evenement.target.value)}
              required
              minLength={3}
              maxLength={50}
            />
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
          <label>
            Description (facultative)
            <textarea
              value={description}
              onChange={(evenement) => setDescription(evenement.target.value)}
              maxLength={1000}
              rows={4}
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>Visibilité</legend>
          <label className="option-visibilite">
            <input type="radio" checked={!estPrive} onChange={() => setEstPrive(false)} />
            Public — n'importe quel joueur peut rejoindre directement
          </label>
          <label className="option-visibilite">
            <input type="radio" checked={estPrive} onChange={() => setEstPrive(true)} />
            Privé — chaque demande doit être validée par vous
          </label>
        </fieldset>

        {erreur && (
          <p role="alert" className="message-erreur">
            {erreur}
          </p>
        )}

        <button type="submit" disabled={chargement}>
          {chargement ? "Création…" : "Créer l'événement"}
        </button>
      </form>
    </main>
  );
};
