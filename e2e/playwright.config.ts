import { defineConfig, devices } from "@playwright/test";

// Contre l'appli réelle (front + back + base), pas de mocks — voir CLAUDE.md,
// "Qualité et déploiement" : les tests Jest isolent déjà la couche Service,
// ces tests-ci vérifient le comportement observable de bout en bout.
// Ne démarre ni le front ni le back : ils doivent déjà tourner (`npm run dev`
// dans backend/ et frontend/, base Docker déjà en route) — plus simple que de
// dupliquer ici la logique de démarrage propre à chaque service.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  // Un seul worker : les tests partagent la vraie base de données (pas de
  // mock), plusieurs en parallèle peuvent se marcher dessus (contention sur
  // les transactions "Serializable" du contrôle des places, notamment) —
  // vérifié en pratique : les mêmes tests passent isolément, échouent en
  // parallèle. Plus lent, mais plus simple que d'isoler chaque test.
  workers: 1,
  retries: 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      // "chrome" (le binaire système déjà installé) plutôt que le Chromium
      // que Playwright téléchargerait lui-même — évite une dépendance de
      // plus à récupérer, le comportement est identique pour ces tests.
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1280, height: 900 } },
    },
  ],
});
