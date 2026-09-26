import { Link } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { useContactForm } from "../hooks/useContactForm";
import { ErreurChamp } from "../components/ErreurChamp";
import { MessageConfirmation } from "../components/MessageConfirmation";
import "../styles/monCompte.css";
import "../styles/aide.css";
import { TitrePage } from "../components/TitrePage";

const QUESTIONS: { question: string; reponse: React.ReactNode }[] = [
  {
    question: "Comment trouver un événement près de chez moi ?",
    reponse: (
      <>
        Sur l'écran <Link to="/">Rechercher</Link>, autorisez la géolocalisation de votre navigateur ou saisissez une
        adresse ou une ville, puis ajustez le rayon (10 km par défaut, 100 km au maximum). Les événements sont triés
        du plus proche au plus éloigné.
      </>
    ),
  },
  {
    question: "Quelle différence entre un événement public et privé ?",
    reponse:
      "Les deux apparaissent dans la recherche. Sur un événement public, l'inscription est immédiate tant qu'il reste des places. Sur un événement privé, vous envoyez une demande que l'organisateur accepte ou refuse ; vous êtes prévenu de sa réponse par notification.",
  },
  {
    question: "Comment ma présence est-elle enregistrée ?",
    reponse:
      "Le jour de l'événement, votre fiche affiche un QR code personnel que l'organisateur scanne. Si votre téléphone ne fonctionne pas, l'organisateur peut aussi vous marquer présent manuellement.",
  },
  {
    question: "Que signifie la « fiabilité » d'un organisateur ?",
    reponse:
      "C'est la moyenne des notes (sur 5) données par les joueurs inscrits, une fois l'événement terminé. Elle n'apparaît qu'après la première évaluation.",
  },
  {
    question: "J'ai perdu mon téléphone : comment me connecter avec la double authentification ?",
    reponse:
      "À l'écran de connexion, saisissez à la place du code à 6 chiffres l'un des 10 codes de secours qui vous ont été montrés à l'activation (chacun ne sert qu'une fois). Sans code de secours, écrivez-nous via le formulaire ci-dessous.",
  },
  {
    question: "Une annonce me semble inappropriée : que faire ?",
    reponse:
      "Depuis la fiche de l'événement, utilisez « Signaler un problème sur cette annonce » en indiquant un motif. Un administrateur examine le signalement.",
  },
  {
    question: "Comment supprimer mon compte ?",
    reponse: (
      <>
        Depuis <Link to="/compte">Mon compte</Link>, section « Supprimer mon compte ». Vos données personnelles sont
        effacées ; voir la <Link to="/confidentialite">politique de confidentialité</Link> pour le détail.
      </>
    ),
  },
];

export const Aide = () => {
  const utilisateur = useAppSelector((state) => state.auth.utilisateur);
  const {
    nom,
    setNom,
    email,
    setEmail,
    message,
    setMessage,
    erreurs,
    validerChampEmail,
    erreur,
    succes,
    effacerSucces,
    chargement,
    soumettre,
  } = useContactForm(utilisateur ? `${utilisateur.prenom} ${utilisateur.nom}` : "", utilisateur?.email ?? "");

  return (
    <main className="page-compte page-aide">
<TitrePage titre={"Aide et questions fréquentes"} description={"Réponses aux questions fréquentes sur OnThePitch et formulaire pour contacter l'équipe."} />
      <h1>Aide</h1>

      <section className="carte-compte">
        <h2>Questions fréquentes</h2>
        {QUESTIONS.map(({ question, reponse }) => (
          <details key={question} className="faq-question">
            <summary>{question}</summary>
            <p>{reponse}</p>
          </details>
        ))}
      </section>

      <section className="carte-compte">
        <h2>Nous contacter</h2>
        <p className="texte-attenue">Vous n'avez pas trouvé de réponse ? Écrivez-nous.</p>
        <form onSubmit={soumettre} noValidate>
          <label>
            Nom
            <input type="text" value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="name" required />
            <ErreurChamp message={erreurs["nom"] || undefined} />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={validerChampEmail}
              autoComplete="email"
              required
            />
            <ErreurChamp message={erreurs["email"] || undefined} />
          </label>
          <label>
            Message
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} maxLength={2000} required />
            <ErreurChamp message={erreurs["message"] || undefined} />
          </label>

          <MessageConfirmation message={succes} onFermer={effacerSucces} />
          {erreur && (
            <p role="alert" className="message-erreur">
              {erreur}
            </p>
          )}

          <button type="submit" disabled={chargement}>
            {chargement ? "Envoi…" : "Envoyer"}
          </button>
        </form>
      </section>

      <p className="texte-attenue">
        <Link to="/mentions-legales">Mentions légales</Link> · <Link to="/confidentialite">Politique de confidentialité</Link>
      </p>
    </main>
  );
};
