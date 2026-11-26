import { describe, expect, it } from "vitest";
import {
  checkAdapterContract,
  loadFixtureRoutes,
} from "../../../../../test/contract/adapter-contract.js";
import type { AdvertDraft } from "../../../crawl-core/ports.js";
import {
  francetravail,
  fromDetail,
  keptFrom,
  listingsOf,
  mapOf,
  parseListing,
  postedOn,
  sliceOf,
  townOf,
} from "./francetravail.js";

// The legacy's test/francetravail.test.mjs, its inputs and expectations, on our shapes (job portals FR-7, T009).
const item = (id: string, title: string, address: string, when: string) => ({
  coordonnees: { lat: 45.7, lon: 4.8 },
  content: {
    id,
    title,
    subtitle: "CHABANNE - ",
    description: "Pour son pôle Structure, &amp; plus...",
    subdescription: when,
    address,
    contract: "CDI\nTemps plein",
  },
});
const page = (n: number) =>
  `<script>T5.initializers(["geoloc/map-render:renderMap",null,${JSON.stringify(
    Array.from({ length: n }, (_, i) =>
      item(
        `2${i}X`,
        `Ingénieur structures ${i} (H/F)`,
        `69 - Lyon ${i + 1}e Arrondissement <a href='https://fr.mappy.com/x'>Voir l'itinéraire</a>`,
        i ? `Publié il y a ${i} jours` : "Publié hier",
      ),
    ),
  )}]);</script>`;
const TODAY = "2026-10-09";
const offerAt = (sourceId: string, posted: string): AdvertDraft => ({
  source: "francetravail",
  sourceId,
  title: "Ingénieur",
  company: "",
  location: "",
  country: "fr",
  city: "",
  remote: false,
  url: `https://candidat.francetravail.fr/offres/recherche/detail/${sourceId}`,
  description: "",
  posted,
  occupationCodes: {},
  language: "fr",
});

describe("France Travail (job portals FR-7)", () => {
  it("reads a listing's map data as offers", () => {
    expect([mapOf(page(3)).length, mapOf("<p>nothing</p>").length]).toEqual([
      3, 0,
    ]);
    const ads = parseListing(page(3), "L", TODAY);
    expect(
      ads.map(({ draft, full }) => [
        draft.sourceId,
        draft.title,
        draft.company,
        draft.city,
        draft.posted,
        full,
      ]),
    ).toEqual([
      [
        "20X",
        "Ingénieur structures 0 (H/F)",
        "CHABANNE",
        "Lyon",
        "2026-10-08",
        false,
      ],
      [
        "21X",
        "Ingénieur structures 1 (H/F)",
        "CHABANNE",
        "Lyon",
        "2026-10-08",
        false,
      ],
      [
        "22X",
        "Ingénieur structures 2 (H/F)",
        "CHABANNE",
        "Lyon",
        "2026-10-07",
        false,
      ],
    ]);
    expect(ads[0]?.draft.url).toBe(
      "https://candidat.francetravail.fr/offres/recherche/detail/20X",
    );
    expect(ads[0]?.draft.description).toBe(
      "Pour son pôle Structure, & plus... · CDI Temps plein",
    );
    expect(parseListing(page(20), "L", TODAY)[0]?.full).toBe(true);
  });

  it("reads how many days ago as a day, and the town without its département and district", () => {
    expect([
      postedOn("Publié aujourd'hui", TODAY),
      postedOn("Publié il y a 23 jours", TODAY),
      postedOn("?", TODAY),
    ]).toEqual(["2026-10-09", "2026-09-16", undefined]);
    expect([
      townOf("2A - AJACCIO"),
      townOf("974 - Saint-Denis"),
      townOf("75 - Paris 8e Arrondissement"),
    ]).toEqual(["AJACCIO", "Saint-Denis", "Paris"]);
  });

  it("reads only the listings of our occupations, a seventh of them each hour", () => {
    const xml = [
      "https://candidat.francetravail.fr/offres/emploi/ingenieur-structures/rhone/s2m4d69",
      "https://candidat.francetravail.fr/offres/emploi/coiffeur/rhone/s10m1d69",
      "https://candidat.francetravail.fr/offres/emploi/ingenieur-structures/ain/s2m4d01",
      "https://candidat.francetravail.fr/offres/emploi/ingenieur-structures/lyon/s2m4v3",
      "https://candidat.francetravail.fr/offres/emploi/coiffeur/lyon/s10m1v3",
    ]
      .map((url) => `<loc>${url}</loc>`)
      .join("");
    expect(listingsOf(xml).map((url) => url.split("/").pop())).toEqual([
      "s2m4d69",
      "s2m4d01",
      "s2m4v3",
    ]);
    const nine = ["0", "1", "2", "3", "4", "5", "6", "7", "8"];
    expect([sliceOf(nine, 1), sliceOf(nine, 8)]).toEqual([
      ["1", "8"],
      ["1", "8"],
    ]);
  });

  it("keeps what slid off a full listing a month, closes what left a listing with room, keeps a listing not read", () => {
    const kept = keptFrom(
      [{ draft: offerAt("n", "2026-10-08"), listing: "L1", full: false }],
      [
        offerAt("a", "2026-10-01"),
        offerAt("b", "2026-10-01"),
        offerAt("c", "2026-08-01"),
        offerAt("d", "2026-10-01"),
      ],
      {
        a: { listing: "L1", full: false },
        b: { listing: "L1", full: true },
        c: { listing: "L1", full: true },
        d: { listing: "L2", full: false },
      },
      new Set(["L1"]),
      TODAY,
    );
    expect(kept.map(({ draft: one }) => one.sourceId)).toEqual(["n", "b", "d"]);
  });

  it("reads each offer's own data: whole text, contract and months, weekly hours, years required, pay", () => {
    const detail = fromDetail({
      descriptif:
        "Description du poste :<br>Vous concevez des structures.<br>Profil : 3 ans d’expérience.",
      syntheseContrat: "CDD - 6 Mois - Contrat travail",
      conditionTravailPoste: {
        listeLibelleTypeHoraire: ["28H/semaine", "Travail en journée"],
      },
      experienceProfil: {
        experience: "3 An(s)",
        estUneExperienceIndispensable: true,
      },
      salaire: { libelle: "Annuel de 29000.0 Euros à 45000.0 Euros" },
    });
    expect([
      detail.description?.split("\n").length,
      detail.contract,
      detail.hours,
      detail.years,
      detail.pay,
    ]).toEqual([
      3,
      "CDD 6 Mois",
      "temps partiel 28 heures",
      3,
      { min: 29000, max: 45000, currency: "EUR", period: "year" },
    ]);
    expect([
      fromDetail({
        conditionTravailPoste: { listeLibelleTypeHoraire: ["35H/semaine"] },
      }).hours,
      fromDetail({
        experienceProfil: {
          experience: "2 An(s)",
          estUneExperienceIndispensable: false,
        },
      }).years,
      fromDetail({
        experienceProfil: {
          experience: "Débutant accepté",
          estUneExperienceIndispensable: false,
        },
      }).years,
    ]).toEqual(["temps plein", 0, 0]);
  });
});

describe("France Travail's saved answers", () => {
  it("map into valid adverts, each offer completed from its own data", async () => {
    expect(
      await checkAdapterContract(
        francetravail,
        await loadFixtureRoutes("francetravail"),
      ),
    ).toEqual([]);
  });
});
