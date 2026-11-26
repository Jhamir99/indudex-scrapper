import { describe, expect, it } from "vitest";
import { loadFixtureRoutes } from "../../../test/contract/adapter-contract.js";
import { FakeHttpClient } from "../../../test/fakes/http-client.js";
import { fakeContext, readDrafts } from "../../../test/fakes/source-adapter.js";
import { portalAdapters } from "./family.js";

// Six enabled portals of different shapes, read live once on 2026-11-26 and saved (job portals T006): a plain sitemap
// (WeRecruit), an index with children (Free-Work), every page read (hekro), list pages (Batiactu), a layout reader of its
// own (Werken bij de Overheid), a page read from its layout (GO RH). Their adverts, which the legacy's own reader gave
// alike from the same answers but for the text's spacing (see tasks.md).
const EXPECTED: Record<string, [string, string, string][]> = {
  "careers.werecruit.io": [
    ["Mécanicien Automobile F/H", "HAPPY JOB LANGON", "fr"],
    [
      "Technicien Bureau d'études en plomberie/ CVC F/H",
      "HAPPY JOB LANGON",
      "fr",
    ],
    ["Mécanicien TP F/H", "LE DU SERVICES (22)", "fr"],
  ],
  "free-work.com": [
    ["Acheteur indirect expérimenté", "Mon Consultant Indépendant", "fr"],
    [
      "Acheteur Industriel Senior – Forge & Matières Premières",
      "R&S TELECOM",
      "fr",
    ],
    ["Acheteur Opérationnel Aéronautique (H/F)", "Freelance.com", "fr"],
  ],
  "hekro.at": [
    [
      "Hilfsarbeiter zur Aluminiumverarbeitung (m/w/x)",
      "hekro Personalservice GmbH",
      "at",
    ],
    ["Pulverbeschichter (m/w/x)", "hekro Personalservice GmbH", "at"],
    ["Abkanter (m/w/x)", "hekro Personalservice GmbH", "at"],
  ],
  "emploi.batiactu.com": [
    [
      "Conducteur Travaux - Grands Projets Pipeline France",
      "Colas France",
      "fr",
    ],
    [
      "PFE - Ingenieur Mecanique - Hauts-de-france F/H",
      "Vinci Construction",
      "fr",
    ],
    [
      "PFE - Ingenieur Materiaux - Hauts-de-france F/H",
      "Vinci Construction",
      "fr",
    ],
  ],
  "werkenbijdeoverheid.nl": [
    [
      "Adviseur IT Risk & Compliance",
      "Dienst Uitvoering Onderwijs (DUO)",
      "nl",
    ],
    ["Post-doc: Data scientist cellular & humoral immunology", "RIVM", "nl"],
    [
      "Junior Linux Beheerder Datacenter Monitoring",
      "Ministerie van Defensie",
      "nl",
    ],
  ],
  "gorh.lu": [
    ["INSTALLATEUR DE CLIMATISATION H/F", "GO RH", "lu"],
    ["CONDUCTEUR DE TRAVAUX – SPÉCIALITÉ PARACHÈVEMENT (H/F)", "GO RH", "lu"],
    ["MONTEUR DE MEUBLES H/F", "GO RH", "lu"],
  ],
};

describe("the saved portal samples (job portals FR-3, FR-9)", () => {
  for (const [id, expected] of Object.entries(EXPECTED)) {
    it(`${id} gives its adverts`, async () => {
      const adapter = portalAdapters().find((one) => one.definition.id === id);
      const drafts = await readDrafts(
        adapter!,
        fakeContext({ http: new FakeHttpClient(await loadFixtureRoutes(id)) }),
      );
      expect(
        drafts.map((draft) => [draft.title, draft.company, draft.country]),
      ).toEqual(expected);
    });
  }
});
