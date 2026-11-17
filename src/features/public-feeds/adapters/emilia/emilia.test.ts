import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import { emilia } from "./emilia.js";

describe("emilia (public-feeds FR-1)", () => {
  it("maps the saved answers into valid adverts", async () => {
    expect(
      await checkAdapterContract(emilia, await loadFixtureRoutes("emilia")),
    ).toEqual([]);
  });
});
