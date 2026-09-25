/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": "@swc/jest",
  },
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  setupFiles: ["<rootDir>/tests/setup/env.ts"],
  clearMocks: true,
  // En CI (Jenkins), en plus de la sortie console : un rapport JUnit que
  // Jenkins sait afficher (nombre de tests, échecs, tendance entre builds).
  reporters: process.env.CI
    ? ["default", ["jest-junit", { outputDirectory: "resultats", outputName: "jest-junit.xml" }]]
    : ["default"],
};
