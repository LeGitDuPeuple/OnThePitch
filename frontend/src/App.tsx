import { Routes, Route } from "react-router-dom";
import { useHydrateAuth } from "./hooks/useHydrateAuth";
import { CarteRecherche } from "./pages/CarteRecherche";
import { FicheEvenement } from "./pages/FicheEvenement";
import { CreationAnnonce } from "./pages/CreationAnnonce";
import { Connexion } from "./pages/Connexion";
import { Admin } from "./pages/Admin";

export const App = () => {
  // Vérifie la session (cookie httpOnly) au démarrage de l'appli.
  useHydrateAuth();

  return (
    <Routes>
      <Route path="/" element={<CarteRecherche />} />
      <Route path="/evenements/:id" element={<FicheEvenement />} />
      <Route path="/creer" element={<CreationAnnonce />} />
      <Route path="/connexion" element={<Connexion />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
};
