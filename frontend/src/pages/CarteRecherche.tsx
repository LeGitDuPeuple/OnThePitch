import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRechercheForm } from "../hooks/useRechercheForm";
import { useSuggestionsAdresse } from "../hooks/useSuggestionsAdresse";
import { useMessageConfirmation } from "../hooks/useMessageConfirmation";
import { CarteInteractive } from "../components/CarteInteractive";
import { SuggestionsAdresse } from "../components/SuggestionsAdresse";
import { ErreurChamp } from "../components/ErreurChamp";
import { MessageConfirmation } from "../components/MessageConfirmation";
import { LIBELLES_NIVEAU } from "../types/evenement";
import "../styles/carteRecherche.css";

const RAYONS_KM = [5, 10, 20, 50, 100];

// Bascule carte/liste sur mobile uniquement (cf. CLAUDE.md, "Responsive") — sans
// effet en tablette/desktop, où les deux zones sont visibles ensemble (CSS).
type Vue = "carte" | "liste";

const formaterDateCourte = (date: string) => {
  const d = new Date(date);
  return {
    jour: d.toLocaleDateString("fr-FR", { day: "2-digit" }),
    mois: d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
  };
};

export const CarteRecherche = () => {
  const {
    adresse,
    setAdresse,
    rayonKm,
    definirRayon,
    pointRecherche,
    resultats,
    chargement,
    erreur,
    erreursChamps,
    rechercherParAdresse,
    rechercherParPosition,
    rechercherSuggestion,
    pageSuivante,
    pagePrecedente,
    peutReculer,
    peutAvancer,
  } = useRechercheForm();
  const { suggestions, choisir, fermer } = useSuggestionsAdresse(adresse);
  const { message: messageConfirmation, lien: lienConfirmation, effacer: effacerConfirmation } = useMessageConfirmation();
  const [vue, setVue] = useState<Vue>("liste");
  const navigate = useNavigate();

  return (
    <main className="page-recherche">
      <h1 className="sr-only">Rechercher un événement</h1>
      <MessageConfirmation message={messageConfirmation} lien={lienConfirmation} onFermer={effacerConfirmation} />
      <div className="panneau-recherche">
        <form
          className="filtres-recherche"
          onSubmit={(evenement) => {
            evenement.preventDefault();
            void rechercherParAdresse();
          }}
        >
          <label className="champ-filtre champ-filtre--large champ-avec-suggestions">
            <span>Où chercher</span>
            <input
              type="text"
              placeholder="Adresse ou ville"
              value={adresse}
              onChange={(evenement) => setAdresse(evenement.target.value)}
              onBlur={fermer}
              autoComplete="off"
            />
            <SuggestionsAdresse
              suggestions={suggestions}
              onChoisir={(suggestion) => {
                choisir(suggestion);
                rechercherSuggestion(suggestion);
              }}
            />
            <ErreurChamp message={erreursChamps.adresse} />
          </label>
          <button type="button" className="bouton-secondaire bouton-position" onClick={rechercherParPosition}>
             Utiliser ma position
          </button>
          <label className="champ-filtre">
            <span>Rayon</span>
            <select value={rayonKm} onChange={(evenement) => definirRayon(Number(evenement.target.value))}>
              {RAYONS_KM.map((valeur) => (
                <option key={valeur} value={valeur}>
                  {valeur} km
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={chargement}>
            {chargement ? "Recherche…" : "Rechercher"}
          </button>
        </form>

        {/* Pas de doublon : une erreur déjà affichée sous le champ adresse ne
            se répète pas ici — ce message ne sert que pour les autres erreurs
            (ex. géolocalisation refusée). */}
        {erreur && Object.keys(erreursChamps).length === 0 && (
          <p role="alert" className="message-erreur">
            {erreur}
          </p>
        )}

        {/* Sans effet en tablette/desktop (CSS) : les deux zones y sont visibles ensemble. */}
        <div className="bascule-vue" role="tablist">
          <button type="button" className={vue === "liste" ? "bouton-secondaire actif" : "bouton-secondaire"} onClick={() => setVue("liste")}>
            Liste
          </button>
          <button type="button" className={vue === "carte" ? "bouton-secondaire actif" : "bouton-secondaire"} onClick={() => setVue("carte")}>
            Carte
          </button>
        </div>

        <section aria-label="Résultats" className={vue === "carte" ? "resultats-recherche cachee-mobile" : "resultats-recherche"}>
          <div className="entete-resultats">
            <span>
              {resultats.length} résultat{resultats.length !== 1 ? "s" : ""}
            </span>
            {resultats.length > 0 && <span className="texte-attenue">Trié par distance</span>}
          </div>
          <ul>
            {resultats.map((evenement) => {
              const { jour, mois } = formaterDateCourte(evenement.dateDebut);
              return (
                <li key={evenement.id}>
                  <Link to={`/evenements/${evenement.id}`} className="carte-evenement">
                    <div className="date-badge">
                      <strong>{jour}</strong>
                      <span>{mois}</span>
                    </div>
                    <div className="carte-evenement-corps">
                      <strong>{evenement.titre}</strong>
                      <div className="texte-attenue">
                        {evenement.ville} ·{" "}
                        {new Date(evenement.dateDebut).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="carte-evenement-badges">
                        {evenement.statut === "Complet" ? (
                          <span className="badge badge--alerte">Complet</span>
                        ) : (
                          <span className="badge">{evenement.placesRestantes} places</span>
                        )}
                        <span className="badge badge--marque">{LIBELLES_NIVEAU[evenement.niveauRequis]}</span>
                        {evenement.estPrive && <span className="badge">Privé</span>}
                      </div>
                    </div>
                    <div className="carte-evenement-distance">{evenement.distanceKm} km</div>
                  </Link>
                </li>
              );
            })}
          </ul>
          {resultats.length > 0 && (
            <div className="pagination-resultats">
              <button type="button" className="bouton-secondaire" onClick={pagePrecedente} disabled={!peutReculer || chargement}>
                Précédent
              </button>
              <button type="button" className="bouton-secondaire" onClick={pageSuivante} disabled={!peutAvancer || chargement}>
                Suivant
              </button>
            </div>
          )}
        </section>
      </div>

      <div className={vue === "liste" ? "panneau-carte cachee-mobile" : "panneau-carte"}>
        {pointRecherche ? (
          <CarteInteractive
            latitude={pointRecherche.latitude}
            longitude={pointRecherche.longitude}
            rayonKm={rayonKm}
            hauteur="100%"
            afficherLegende
            points={resultats.map((evenement) => ({
              id: evenement.id,
              latitude: evenement.latitude,
              longitude: evenement.longitude,
              label: `${evenement.titre} · ${new Date(evenement.dateDebut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
              onClick: () => navigate(`/evenements/${evenement.id}`),
            }))}
          />
        ) : (
          <div className="carte-vide">
            <p>Cherchez une adresse ou utilisez votre position pour voir la carte.</p>
          </div>
        )}
      </div>
    </main>
  );
};
