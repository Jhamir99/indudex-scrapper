// Publication's public entry: the processor's run (AGENTS.md, "Features": the publication runs
// every step, through their index.ts). It reads the store, the catalogues, the configuration and the
// processor's state, builds the offers, and writes a whole version of the dataset, then moves the
// pointer, unless the pile fell (FR-1, FR-10 to FR-12). It never asks the network.
import type { CatalogueOf } from "../../shared/catalogues/read-catalogue.js";
import type { KeptRegisterCompany } from "../../shared/storage/registers-file.js";
import type { PublishedDataset } from "../../shared/storage/published-dataset.js";
import { versionOf } from "../../shared/storage/published-dataset.js";
import type { Rates } from "../../shared/rates/ecb.js";
import {
  isCompanyBoard,
  type SourceDefinition,
} from "../../shared/schemas/source.js";
import type { StoredAdvert } from "../../shared/schemas/advert.js";
import {
  PublishedCompanies,
  PublishedCompanyCards,
  PublishedIndex,
  PublishedPlaces,
  PublishedRegions,
  PublishedStatus,
  RegisterCompanies,
  Today,
} from "../../shared/schemas/published/dataset.js";
import { Offer, OffersPart } from "../../shared/schemas/published/offer.js";
import { createFactReader } from "../advert-facts/index.js";
import {
  companyCards,
  type History,
  readHistory,
  updateCompanies,
  withRegisters,
  writeHistory,
} from "../companies/index.js";
import { companyOf } from "../dedupe/index.js";
import { createGate, writeExplainReport } from "../gate/index.js";
import { createPayReader } from "../pay/index.js";
import { createPlacer } from "../places/index.js";
import { backdropOffers } from "./backdrop.js";
import { build } from "./build.js";
import {
  cardFiles,
  companyFiles,
  indexFile,
  isIntermediary,
  placesFile,
  regionsFile,
  sourcesOf,
  statusFile,
} from "./files.js";
import { readStore, type StoreReader } from "./read-store.js";
import { buildShards } from "./shards.js";
import { guard, pileCounts, remember } from "./shrink-guard.js";
import { readState, writeState } from "./state.js";
import { buildWordIndex } from "./word-index.js";
import {
  readCache,
  readTranslatorFile,
  writeTranslatorFile,
} from "../../shared/storage/title-caches.js";
import {
  LANGUAGES,
  languageOf,
  latestPicks,
  wantedTitles,
} from "../title-translation/index.js";

export { DatasetError } from "../../shared/storage/published-dataset.js";
// The last day a text writes, for the scrapper's readers of a page's labelled fields (job portals T003).
export { deadlineInText } from "./labels/days.js";

// The catalogues the steps read, as `readCatalogue` gives them.
export interface PublicationCatalogues {
  readonly families: CatalogueOf<"families">;
  readonly isco: CatalogueOf<"isco">;
  readonly ssykIsco: CatalogueOf<"ssykIsco">;
  readonly titles: CatalogueOf<"titles">;
  readonly confirmedTitles: CatalogueOf<"confirmedTitles">;
  readonly countries: CatalogueOf<"countries">;
  readonly nuts: CatalogueOf<"nuts">;
  readonly degrees: CatalogueOf<"degrees">;
  readonly languages: CatalogueOf<"languages">;
  readonly places: Parameters<typeof createPlacer>[0]["places"];
}

export interface PublicationDependencies {
  readonly store: StoreReader;
  readonly registers: readonly KeptRegisterCompany[];
  readonly rates: Rates;
  readonly catalogues: PublicationCatalogues;
  // The catalogues the dataset carries for the web (`publishedCatalogues`), by name.
  readonly publishedCatalogues: Readonly<Record<string, unknown>>;
  readonly catalogueVersion: number;
  readonly takedowns: {
    sourceReason(source: string): string | undefined;
    advertReason(url: string): string | undefined;
    readonly companyNames: readonly string[];
  };
  readonly untranslated: ReadonlySet<string>;
  // The registry's sources; those switched off are not listed.
  readonly definitions: readonly SourceDefinition[];
  readonly dataset: PublishedDataset;
  readonly stateDirectory: string;
  readonly now: () => Date;
  readonly log: (line: string) => void;
  readonly force?: boolean;
  readonly explain?: boolean;
}

export type PublicationResult =
  | {
      readonly published: true;
      readonly version: string;
      readonly offers: number;
    }
  | { readonly published: false; readonly reason: string };

const gb = (bytes: number) => `${(bytes / 2 ** 30).toFixed(2)} GB`;

export async function runPublication(
  deps: PublicationDependencies,
): Promise<PublicationResult> {
  const startedAt = deps.now();
  const today = startedAt.toISOString().slice(0, 10);
  const stages: string[] = [];
  let stageStarted = Date.now();
  const stage = (name: string) => {
    const now = Date.now();
    stages.push(
      `${name} ${Math.round((now - stageStarted) / 1000)} s ${gb(process.memoryUsage().heapUsed)}`,
    );
    stageStarted = now;
  };
  const { catalogues } = deps;
  const definitions = new Map(
    deps.definitions.map((source) => [source.id, source]),
  );
  const listed = new Set(
    deps.definitions
      .filter((source) => !source.disabledReason)
      .map((source) => source.id),
  );
  // An employer taken down, by its name read as one (an ATS code, a legal form, the country off).
  const takenCompanies = new Set(
    deps.takedowns.companyNames.map(companyOf).filter(Boolean),
  );
  const isTakenCompany = (name: string) => takenCompanies.has(companyOf(name));

  const reading = await readStore({
    store: deps.store,
    listed,
    takedowns: {
      sourceReason: (source) => deps.takedowns.sourceReason(source),
      advertTaken: (url) => deps.takedowns.advertReason(url) !== undefined,
      companyTaken: isTakenCompany,
    },
    now: startedAt,
  });
  stage("store read");

  const gate = createGate(catalogues);
  const placer = createPlacer({
    places: catalogues.places,
    nuts: catalogues.nuts,
    countries: catalogues.countries.countries,
  });
  const facts = createFactReader({
    degrees: catalogues.degrees,
    languages: catalogues.languages,
    titles: [],
    keptAsWritten: deps.untranslated,
  });
  const optionalGroups = new Set(
    catalogues.families.groups.filter((g) => g.optional).map((g) => g.id),
  );
  const optionalFamilies = new Set(
    catalogues.families.families
      .filter((f) => optionalGroups.has(f.group))
      .map((f) => f.id),
  );
  const kinds = new Map(
    deps.definitions.map((source) => [source.id, source.kind]),
  );
  const isVia = (source: string) => {
    const kind = kinds.get(source);
    return kind !== undefined && isIntermediary(kind);
  };
  const remembered =
    (await readState(deps.stateDirectory, "taken.json"))?.taken ?? [];
  // Each language's cache of translated titles; one that cannot be read leaves its language's
  // titles as written this time, with an alert: the build only reads them.
  const caches: Record<string, Map<string, string>> = {};
  for (const language of LANGUAGES) {
    try {
      caches[language] = await readCache(deps.stateDirectory, language);
    } catch (error) {
      deps.log(
        `ALERT ${error instanceof Error ? error.message : String(error)}: its titles stay as written`,
      );
      caches[language] = new Map();
    }
  }
  stage("steps compiled");

  const built = build({
    caches,
    reading,
    steps: { gate, placer, facts, pay: createPayReader({ rates: deps.rates }) },
    kinds,
    untranslated: deps.untranslated,
    optionalFamilies,
    remembered,
    stillTaken: (url) => deps.takedowns.advertReason(url) !== undefined,
    today,
    stage,
  });
  const offers = built.offers;
  const main = offers.filter(built.inMain);
  // Every offer as the contract names it: an unknown field fails the build (FR-9).
  for (const offer of offers) Offer.parse(offer);

  // The shrink guard, before anything is written: a held build writes nothing.
  const counts = pileCounts(main);
  const current = await deps.dataset.current();
  const history =
    (await readState(deps.stateDirectory, "pile-history.json"))?.piles ?? [];
  const lastPublishedAt = current ? versionTime(current) : null;
  const verdict = guard({
    counts,
    history,
    lastPublishedAt,
    force: Boolean(deps.force),
    now: startedAt.getTime(),
  });
  if (!verdict.publish) {
    deps.log(verdict.reason);
    return { published: false, reason: verdict.reason };
  }
  if (verdict.alert) deps.log(verdict.alert);

  const generatedAt = deps.now().toISOString();
  let companyHistory: History = {};
  const writer = await deps.dataset.start(versionOf(new Date(generatedAt)));
  try {
    const json = (
      path: string,
      schema: { parse(value: unknown): unknown },
      value: unknown,
    ) => writer.write(path, JSON.stringify(schema.parse(value)));

    const families = catalogues.families.families.map((f) => ({
      id: f.id,
      label: f.label,
      group: f.group,
    }));
    const shards = buildShards(
      offers,
      families,
      startedAt.getTime(),
      optionalFamilies,
    );
    for (const [name, text] of shards.files) {
      if (name.endsWith(".json")) OffersPart.parse(JSON.parse(text));
      await writer.write(name, text);
    }
    stage("shards");

    const wordFiles: [string, string][] = [];
    const words = buildWordIndex(offers, isVia, "words", (path, content) =>
      wordFiles.push([path, content]),
    );
    for (const [path, content] of wordFiles) await writer.write(path, content);
    wordFiles.length = 0;
    stage("word index");

    // The towns with offers (a campaign's copies too), the names not to take for a town alone, and
    // the regions and provinces in use with the registers' companies.
    const towns = placer.townsInUse([
      ...built.placements.values(),
      ...built.campaignPlacements,
    ]);
    const ambiguous = placer.ambiguousNames(
      towns,
      offers.flatMap((offer) => {
        const placement = built.placements.get(offer.id);
        return placement
          ? [{ title: offer.t, company: offer.c, placement }]
          : [];
      }),
    );
    const registers = deps.registers.filter(
      (company) => !isTakenCompany(company.name),
    );
    const regions = placer.regionsInUse(
      main.map((offer) => ({ country: offer.cc, nuts: offer.n ?? null })),
      registers.map((company) => ({
        country: company.country,
        nuts: company.nuts,
      })),
    );
    await json("places.json", PublishedPlaces, placesFile(towns, ambiguous));
    await json("regions.json", PublishedRegions, regionsFile(regions));
    await json("today.json", Today, {
      v: 1,
      offers: backdropOffers(main, isVia),
      latest: latestPicks(main, { isVia, languageOf }),
    });
    stage("places");

    // The directory, kept between runs, the registers joined, and the cards.
    companyHistory = await readHistory(deps.stateDirectory);
    const groupOf = new Map(
      catalogues.families.families.map((f) => [f.id, f.group]),
    );
    const rows = updateCompanies(
      companyHistory,
      built.directory,
      (family) => groupOf.get(family) ?? "",
      generatedAt.slice(0, 10),
      isTakenCompany,
    );
    const joined = withRegisters(rows, registers, built.directory);
    for (const [path, value] of companyFiles({
      generatedAt,
      groups: catalogues.families.groups,
      rows,
      local: joined.local,
    }))
      await json(
        path,
        path === "companies.json" ? PublishedCompanies : RegisterCompanies,
        value,
      );
    const cards = companyCards({
      employers: rows,
      joined,
      offers: built.directory,
      groupOf: (family) => groupOf.get(family) ?? "",
    });
    for (const [path, value] of cardFiles(cards))
      await json(path, PublishedCompanyCards, value);
    stage("companies");

    for (const [name, catalogue] of Object.entries(deps.publishedCatalogues))
      await writer.write(`catalogues/${name}.json`, JSON.stringify(catalogue));
    if (deps.explain)
      await writeExplainReport(
        reading.passes.flatMap((pass) =>
          (pass.adverts as StoredAdvert[]).map((advert) => ({
            ...advert,
            board: isCompanyBoard(pass.source, kinds.get(pass.source)),
          })),
        ),
        gate.decide,
        writer.folder,
      );

    const seen = reading.passes.map((pass) => pass.source);
    const boardSources = seen.filter(
      (source) => kinds.get(source) === "careers",
    ).length;
    const seconds = Math.round((Date.now() - startedAt.getTime()) / 1000);
    await json(
      "status.json",
      PublishedStatus,
      statusFile({
        generatedAt,
        crawledAt: reading.crawledAt,
        offers,
        main,
        counts: built.counts,
        sourceFiles: reading.sources,
        duplicates: built.duplicates,
        optionalFamilies,
      }),
    );
    await json(
      "index.json",
      PublishedIndex,
      indexFile({
        generatedAt,
        crawledAt: reading.crawledAt,
        catalogueVersion: deps.catalogueVersion,
        shards,
        sources: sourcesOf(seen, definitions),
        offers,
        main,
        counts: built.counts,
        isVia,
        sourceFiles: reading.sources,
        boardSources,
        seconds,
        words: words.manifest,
      }),
    );
    await writer.finish();
  } catch (error) {
    await writer.abandon();
    throw error;
  }
  stage("writing");

  // What the next build remembers: the directory, the pile's counts (a fall published starts the
  // history again) and the adverts taken down seen so far.
  await writeHistory(deps.stateDirectory, companyHistory);
  await writeState(deps.stateDirectory, "pile-history.json", {
    piles: remember(
      verdict.fell.length ? [] : history,
      counts,
      Date.parse(generatedAt),
    ),
  });
  await writeState(deps.stateDirectory, "taken.json", {
    taken: [...built.taken],
  });
  // The titles the caches lack, for the translator; a title to translate anew asked for again.
  const redo = new Set(
    await readTranslatorFile<string[]>(deps.stateDirectory, "redo", []).catch(
      () => [],
    ),
  );
  const wanted = wantedTitles(offers, caches, {
    untranslated: deps.untranslated,
    redo,
  });
  await writeTranslatorFile(deps.stateDirectory, "wanted", wanted);
  deps.log(
    `titles: ${wanted.length} titles (${wanted.reduce((n, w) => n + w.n, 0)} offers) left for the translator`,
  );

  const c = built.counts;
  deps.log(
    `store: ${reading.sources} sources, newest pass ${reading.crawledAt || "never"}`,
  );
  deps.log(
    `found ${c.found} · outside vertical ${c.outsideVertical} · outside Europe ${c.outsideEurope} · hygiene ${c.hygiene} · no link ${c.noLink} · stale ${c.stale} · expired ${c.expired} · over a year old ${c.old} · withdrawn ${c.withdrawn} · duplicates ${built.duplicates.sameUrl + built.duplicates.sameRole}`,
  );
  deps.log(
    `kept ${offers.length} offers (${offers.length - main.length} of them in the skilled trades)`,
  );
  deps.log(`stages: ${stages.join(" · ")}`);
  deps.log(`memory: peak ${gb(process.resourceUsage().maxRSS * 1024)}`);
  return {
    published: true,
    version: versionOf(new Date(generatedAt)),
    offers: offers.length,
  };
}

// The time a version was built, from its name.
const versionTime = (version: string): string =>
  version.replace(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
    "$1-$2-$3T$4:$5:$6Z",
  );
