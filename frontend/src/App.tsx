import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { useHydrateAuth } from "./hooks/useHydrateAuth";
import { Entete } from "./components/Entete";
import { PiedDePage } from "./components/PiedDePage";
import "./styles/aide.css";
import { CarteRecherche } from "./pages/CarteRecherche";

// Découpage du code par route (voir CLAUDE.md, "Front React") : "/" (import
// direct ci-dessus) reste la seule page chargée avec le code principal,
// puisque c'est la première chose que voit quasiment tout le monde — les
// autres ne sont téléchargées qu'au moment d'y naviguer. Les composants sont
// exportés nommément (`export const X`), pas par défaut : `lazy()` exige un
// export par défaut, d'où le `.then(...)` qui adapte l'un vers l'autre.
const FicheEvenement = lazy(() => import("./pages/FicheEvenement").then((m) => ({ default: m.FicheEvenement })));
const CreationAnnonce = lazy(() => import("./pages/CreationAnnonce").then((m) => ({ default: m.CreationAnnonce })));
const Connexion = lazy(() => import("./pages/Connexion").then((m) => ({ default: m.Connexion })));
const Inscription = lazy(() => import("./pages/Inscription").then((m) => ({ default: m.Inscription })));
const Admin = lazy(() => import("./pages/Admin").then((m) => ({ default: m.Admin })));
const Profil = lazy(() => import("./pages/Profil").then((m) => ({ default: m.Profil })));
const Aide = lazy(() => import("./pages/Aide").then((m) => ({ default: m.Aide })));
const MentionsLegales = lazy(() => import("./pages/MentionsLegales").then((m) => ({ default: m.MentionsLegales })));
const Confidentialite = lazy(() => import("./pages/Confidentialite").then((m) => ({ default: m.Confidentialite })));
const MonCompte = lazy(() => import("./pages/MonCompte").then((m) => ({ default: m.MonCompte })));

export const App = () => {
  // Vérifie la session (cookie httpOnly) au démarrage de l'appli.
  useHydrateAuth();

  return (
    <>
      <Entete />
      <Suspense fallback={<p className="texte-attenue" style={{ padding: "2rem" }}>Chargement…</p>}>
        <Routes>
          <Route path="/" element={<CarteRecherche />} />
          <Route path="/evenements/:id" element={<FicheEvenement />} />
          <Route path="/creer" element={<CreationAnnonce />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/inscription" element={<Inscription />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/profil" element={<Profil />} />
          <Route path="/compte" element={<MonCompte />} />
          <Route path="/aide" element={<Aide />} />
          <Route path="/mentions-legales" element={<MentionsLegales />} />
          <Route path="/confidentialite" element={<Confidentialite />} />
        </Routes>
      </Suspense>
      <PiedDePage />
    </>
  );
};
