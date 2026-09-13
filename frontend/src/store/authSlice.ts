import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { stockageAuth } from "../utils/stockageAuth";

export type Role = "joueur" | "administrateur";

export type Utilisateur = {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  ville: string | null;
};

type EtatAuth = {
  utilisateur: Utilisateur | null;
  // true tant que la vérification de session initiale (GET /auth/profil) n'est pas
  // terminée — évite d'afficher un état "déconnecté" avant d'avoir la vraie réponse.
  chargementInitial: boolean;
};

const etatInitial: EtatAuth = {
  utilisateur: stockageAuth.lireUtilisateur<Utilisateur>(),
  chargementInitial: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState: etatInitial,
  reducers: {
    connexionReussie: (state, action: PayloadAction<Utilisateur>) => {
      state.utilisateur = action.payload;
      state.chargementInitial = false;
      stockageAuth.enregistrer(action.payload);
    },
    deconnexionReussie: (state) => {
      state.utilisateur = null;
      state.chargementInitial = false;
      stockageAuth.effacer();
    },
    // Résultat de la vérification de session au démarrage (voir hooks/useHydrateAuth.ts).
    hydratationTerminee: (state, action: PayloadAction<Utilisateur | null>) => {
      state.utilisateur = action.payload;
      state.chargementInitial = false;

      if (action.payload) {
        stockageAuth.enregistrer(action.payload);
      } else {
        stockageAuth.effacer();
      }
    },
  },
});

export const { connexionReussie, deconnexionReussie, hydratationTerminee } = authSlice.actions;
export default authSlice.reducer;
