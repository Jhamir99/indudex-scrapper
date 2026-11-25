import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // The title method's first call in a file builds thousands of patterns (about 2 s alone); with every file running
    // at once it went past Vitest's 5 s on 25 November 2026.
    testTimeout: 20_000,
    // test/legacy/: the legacy's own test files, carried as they were (JavaScript).
    include: [
      "src/**/*.test.ts",
      "test/**/*.test.ts",
      "test/legacy/**/*.test.mjs",
    ],
  },
});
