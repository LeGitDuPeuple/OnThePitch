import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";

// Périmètre volontairement limité à l'authentification (voir CLAUDE.md, section
// "Front React") : le reste de l'état applicatif (recherche, fiche événement)
// reste local à chaque page.
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
