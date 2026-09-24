import { Link } from "react-router-dom";
import { useProfil, GroupeEvenements } from "../hooks/useProfil";
import { Avatar } from "../components/Avatar";
import { LIBELLES_NIVEAU } from "../types/evenement";
import type { Evenement } from "../types/evenement";
import "../styles/carteRecherche.css";
import "../styles/profil.css";

const formaterDateCourte = (date: string) => {
  const d = new Date(date);
  return {
    jour: d.toLocaleDateString("fr-FR", { day: "2-digit" }),
    mois: d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
  };
};

const CarteEvenementProfil = ({ evenement }: { evenement: Evenement }) => {
  const { jour, mois } = formaterDateCourte(evenement.dateDebut);

  return (
    <li>
      <Link to={`/evenements/${evenement.id}`} className="carte-evenement">
        <div className="date-badge">
          <strong>{jour}</strong>
          <span>{mois}</span>
        </div>
        <div className="carte-evenement-corps">
          <strong>{evenement.titre}</strong>
          <div className="texte-attenue">
            {new Date(evenement.dateDebut).toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="carte-evenement-badges">
            {evenement.statut === "Termine" ? (
              <span className="badge badge--info">Terminé</span>
            ) : evenement.statut === "Complet" ? (
              <span className="badge badge--alerte">Complet</span>
            ) : (
              <span className="badge">{evenement.placesRestantes} places</span>
            )}
            <span className="badge badge--marque">{LIBELLES_NIVEAU[evenement.niveauRequis]}</span>
            {evenement.estPrive && <span className="badge">Privé</span>}
          </div>
        </div>
      </Link>
    </li>
  );
};

const GroupeSection = ({ groupe }: { groupe: GroupeEvenements }) => {
  if (groupe.aVenir.length === 0 && groupe.termines.length === 0) {
    return <p className="texte-attenue">Aucun événement pour l'instant.</p>;
  }

  return (
    <>
      {groupe.aVenir.length > 0 && (
        <ul className="liste-profil">
          {groupe.aVenir.map((evenement) => (
            <CarteEvenementProfil key={evenement.id} evenement={evenement} />
          ))}
        </ul>
      )}
      {groupe.termines.length > 0 && (
        <details className="profil-sous-groupe-termines">
          <summary>Terminés ({groupe.termines.length})</summary>
          <ul className="liste-profil">
            {groupe.termines.map((evenement) => (
              <CarteEvenementProfil key={evenement.id} evenement={evenement} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
};

// Écran Profil (demandé le 20/09/2026) : mes événements organisés, ceux que je
// rejoins, mes demandes en attente. Volontairement sans score de "Fiabilité"
// (voir CLAUDE.md, écart de périmètre maquette — bloqué par l'absence de
// système de notation).
export const Profil = () => {
  const { utilisateur, organises, participe, enAttente, chargement, erreur } = useProfil();

  if (!utilisateur) {
    return (
      <main className="page-profil">
        <p>
          <Link to="/connexion">Connectez-vous</Link> pour voir votre profil.
        </p>
      </main>
    );
  }

  return (
    <main className="page-profil">
      <div className="profil-entete">
        <Avatar nom={utilisateur.nom} prenom={utilisateur.prenom} taille={48} />
        <h1>
          {utilisateur.prenom} {utilisateur.nom}
        </h1>
      </div>

      {erreur && (
        <p role="alert" className="message-erreur">
          {erreur}
        </p>
      )}

      {chargement ? (
        <p className="texte-attenue">Chargement…</p>
      ) : (
        <>
          <section className="profil-section">
            <h2>Événements que j'organise</h2>
            {organises && <GroupeSection groupe={organises} />}
          </section>

          <section className="profil-section">
            <h2>Événements auxquels je participe</h2>
            {participe && <GroupeSection groupe={participe} />}
          </section>

          <section className="profil-section">
            <h2>Mes demandes en attente</h2>
            {enAttente.length === 0 ? (
              <p className="texte-attenue">Aucune demande en attente.</p>
            ) : (
              <ul className="liste-profil">
                {enAttente.map((evenement) => (
                  <CarteEvenementProfil key={evenement.id} evenement={evenement} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
};
