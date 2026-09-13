import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "./store/store";
import { App } from "./App";
import "./index.css";

const conteneur = document.getElementById("root");

if (!conteneur) {
  throw new Error("Élément #root introuvable dans index.html");
}

createRoot(conteneur).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>
);
