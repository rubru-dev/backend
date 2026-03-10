import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  globalSetup: "./setup/globalSetup.ts",
  globalTeardown: "./setup/globalTeardown.ts",
  testMatch: ["**/tests/**/*.test.ts"],
  testTimeout: 30000,
  verbose: true,
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "./tsconfig.json" }],
  },
};

export default config;
