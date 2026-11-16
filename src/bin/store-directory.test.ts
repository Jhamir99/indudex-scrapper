import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { storeDirectory } from "./store-directory.js";

describe("storeDirectory", () => {
  it("is store/ at the repo root by default", () => {
    expect(storeDirectory({})).toBe(
      fileURLToPath(new URL("../../store", import.meta.url)),
    );
  });

  it("takes STORE_DIR when set", () => {
    expect(storeDirectory({ STORE_DIR: "/srv/indudex/store" })).toBe(
      resolve("/srv/indudex/store"),
    );
  });
});
