import { describe, expect, it } from "vitest";
import { goldenNames } from "../../../test/companies/golden.js";
import {
  cleanName,
  companyKey,
  displayName,
  townKey,
  usable,
} from "./company-key.js";

describe("the employer's key (companies FR-3)", () => {
  it("gives one key to one employer's spellings", () => {
    expect(["Siemens AG", "SIEMENS", "Siemens"].map(companyKey)).toEqual([
      "siemens",
      "siemens",
      "siemens",
    ]);
    expect(companyKey("Müller GmbH & Co. KG")).toBe("muller");
    expect(companyKey("Ørsted A/S")).toBe("orsted");
  });

  it("takes legal forms off the end only, and the Russian ones off the front", () => {
    expect(
      ["SAS Institute", "Groupe SEB", "SEB AB", "ООО «Мегафон»"].map(
        companyKey,
      ),
    ).toEqual(["sas institute", "groupe seb", "seb", "мегафон"]);
    expect(
      ["Acciona S.A.U.", "Comarch Sp. z o.o.", "Škoda spol. s r.o."].map(
        companyKey,
      ),
    ).toEqual(["acciona", "comarch", "skoda"]);
  });

  it("names no employer with a hiding word or fewer than two letters", () => {
    expect(
      ["Confidential", "our client", "0", "B", "Siemens"].map(usable),
    ).toEqual([false, false, false, false, true]);
  });

  it("shows a register's name in capitals as people write it", () => {
    expect(
      [
        "SANDNES ELEKTRISKE AS",
        "ABB AS",
        "SOCIETE DES EAUX DE PARIS",
        "Siemens AG",
      ].map(displayName),
    ).toEqual([
      "Sandnes Elektriske AS",
      "ABB AS",
      "Societe des Eaux de Paris",
      "Siemens AG",
    ]);
    expect(cleanName(' "QEMS" s.r.o. ')).toBe("QEMS s.r.o.");
  });

  it("keys a town without its district's number", () => {
    expect(["Paris 13", "Marseille 15eme", "Zürich"].map(townKey)).toEqual([
      "paris",
      "marseille",
      "zurich",
    ]);
  });

  it("reads every name of the legacy's golden set the same", async () => {
    const differ = (await goldenNames()).filter(
      ({ s, clean, key, usable: u, display }) => {
        const cleaned = cleanName(s);
        return (
          cleaned !== clean ||
          companyKey(cleaned) !== key ||
          usable(cleaned) !== u ||
          displayName(cleaned) !== display
        );
      },
    );
    expect(differ.map(({ s }) => s)).toEqual([]);
  });
});
