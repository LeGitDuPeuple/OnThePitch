import { Link } from "react-router-dom";
import { useRechercheForm } from "../hooks/useRechercheForm";
import "../styles/carteRecherche.css";

const RAYONS_KM = [5, 10, 20, 50, 100];

export const CarteRecherche = () => {
  const {
    adresse,
    setAdresse,
    rayonKm,
    definirRayon,
    resultats,
    chargement,
    erreur,
    rechercherParAdresse,
    rechercherParPosition,
  } = useRechercheForm();

  return (
    <main className="page-recherche">
      <h1>OnThePitch</h1>

      <form
        className="filtres-recherche"
        onSubmit={(evenement) => {
          evenement.preventDefault();
          void rechercherParAdresse();
        }}
      >
        <input
          type="text"
          placeholder="Où chercher ? (adresse, ville...)"
          value={adresse}
          onChange={(evenement) => setAdresse(evenement.target.value)}
        />
        <button type="button" onClick={rechercherParPosition}>
          Utiliser ma position
        </button>
        <select value={rayonKm} onChange={(evenement) => definirRayon(Number(evenement.target.value))}>
          {RAYONS_KM.map((valeur) => (
            <option key={valeur} value={valeur}>
              {valeur} km
            </option>
          ))}
        </select>
        <button type="submit" disabled={chargement}>
          {chargement ? "Recherche…" : "Rechercher"}
        </button>
      </form>

      {erreur && (
        <p role="alert" className="message-erreur">
          {erreur}
        </p>
      )}

      <section aria-label="Résultats" className="resultats-recherche">
        <p>
          {resultats.length} résultat{resultats.length !== 1 ? "s" : ""}
        </p>
        <ul>
          {resultats.map((evenement) => (
            <li key={evenement.id}>
              <Link to={`/evenements/${evenement.id}`} className="carte-evenement">
                <strong>{evenement.titre}</strong>
                {evenement.estPrive && <span className="badge-prive">privé</span>}
                <div>
                  {evenement.ville} · {evenement.distanceKm} km
                </div>
                <div>
                  {new Date(evenement.dateDebut).toLocaleString("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </div>
                <div>{evenement.placesRestantes} places restantes</div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
};
