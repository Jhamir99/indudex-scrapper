import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // test/legacy/: the legacy's own test files, carried as they were (JavaScript).
    include: [
      "src/**/*.test.ts",
      "test/**/*.test.ts",
      "test/legacy/**/*.test.mjs",
    ],
  },
});
