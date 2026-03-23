/** @type {import('jest').Config} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.test.json",
        diagnostics: {
          ignoreDiagnostics: [151002],
        },
      },
    ],
  },
  extensionsToTreatAsEsm: [".ts"],
  setupFiles: ["<rootDir>/tests/helpers/setup-env.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/server.ts", "!src/seed.ts"],
  coverageDirectory: "coverage",
};
