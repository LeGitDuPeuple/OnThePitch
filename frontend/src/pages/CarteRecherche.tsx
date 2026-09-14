import { useState } from "react";
import { Link } from "react-router-dom";
import { useRechercheForm } from "../hooks/useRechercheForm";
import "../styles/carteRecherche.css";

const RAYONS_KM = [5, 10, 20, 50, 100];

// Bascule carte/liste sur mobile uniquement (cf. CLAUDE.md, "Responsive") — sans
// effet en tablette/desktop, où les deux zones sont visibles ensemble (CSS).
type Vue = "carte" | "liste";

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
  const [vue, setVue] = useState<Vue>("liste");

  return (
    <main className="page-recherche">
      <h1>Rechercher un événement</h1>

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

      {/* Sans effet en tablette/desktop (CSS) : les deux zones y sont visibles ensemble. */}
      <div className="bascule-vue" role="tablist">
        <button type="button" className={vue === "carte" ? "actif" : ""} onClick={() => setVue("carte")}>
          Carte
        </button>
        <button type="button" className={vue === "liste" ? "actif" : ""} onClick={() => setVue("liste")}>
          Liste
        </button>
      </div>

      <div className="zone-resultats">
        <div className={vue === "liste" ? "zone-carte cachee-mobile" : "zone-carte"} aria-label="Carte">
          <p>Carte interactive à venir</p>
        </div>

        <section
          aria-label="Résultats"
          className={vue === "carte" ? "resultats-recherche cachee-mobile" : "resultats-recherche"}
        >
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
      </div>
    </main>
  );
};
