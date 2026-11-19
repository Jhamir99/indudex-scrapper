import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXTURES_DIRECTORY } from "../../../test/contract/adapter-contract.js";
import { labelledMode, placeMode, workModeOf } from "./work-mode.js";

const advert = (fields: {
  title?: string;
  location?: string;
  description?: string;
  workMode?: "onsite" | "hybrid" | "remote";
}) => ({ title: "", location: "", description: "", ...fields });

describe("the work mode (FR-3)", () => {
  it("believes the source's own field", () => {
    expect(
      workModeOf(advert({ workMode: "onsite", description: "Fully remote" })),
    ).toBe("onsite");
  });

  it("reads a source's remote as hybrid when its own text says some days at home", () => {
    expect(
      workModeOf(
        advert({ workMode: "remote", description: "Bis zu 60% Homeoffice" }),
      ),
    ).toBe("hybrid");
  });

  it("reads a LinkedIn tag, a remote location, a labelled field", () => {
    expect(workModeOf(advert({ description: "Join us! #LI-Hybrid" }))).toBe(
      "hybrid",
    );
    expect(placeMode("Hamburg / Homeoffice möglich")).toBe("hybrid");
    expect(placeMode("Remote")).toBe("remote");
    expect(labelledMode("Work Model: Hybrid – onsite and remote")).toBe(
      "hybrid",
    );
    expect(labelledMode("Télétravail : non")).toBe("");
  });

  it("says nothing when tag and location disagree", () => {
    expect(
      workModeOf(advert({ location: "Remote", description: "#LI-Onsite" })),
    ).toBeNull();
  });

  it("reads a sentence that states it, not a passing word", () => {
    expect(
      workModeOf(advert({ description: "You work 2 days a week from home." })),
    ).toBe("hybrid");
    expect(
      workModeOf(
        advert({ description: "Experience with remote monitoring systems." }),
      ),
    ).toBeNull();
    expect(
      workModeOf(
        advert({ description: "Our hybrid cloud platform runs in Azure." }),
      ),
    ).toBeNull();
  });

  it("reads every text of the legacy's tests as the legacy did", async () => {
    const { cases } = JSON.parse(
      await readFile(
        join(FIXTURES_DIRECTORY, "advert-facts", "work-mode.json"),
        "utf8",
      ),
    ) as {
      cases: {
        field: "title" | "location" | "description";
        text: string;
        workMode?: "onsite" | "hybrid" | "remote";
        mode: string | null;
      }[];
    };
    const differing = cases.filter(
      (one) =>
        workModeOf(
          advert({
            [one.field]: one.text,
            ...(one.workMode ? { workMode: one.workMode } : {}),
          }),
        ) !== one.mode,
    );
    expect(cases.length).toBeGreaterThan(1000);
    expect(differing).toEqual([]);
  });
});
