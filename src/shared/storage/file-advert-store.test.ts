import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AdvertStore } from "../../features/crawl-core/ports.js";
import { FakeClock } from "../../../test/fakes/clock.js";
import { type Advert, advertId } from "../schemas/advert.js";
import type { SourceState } from "../schemas/source.js";
import { FileAdvertStore, StoreError } from "./file-advert-store.js";

const DAY = 86_400_000;

function advert(
  source: string,
  sourceId: string,
  fields: { posted?: string; expires?: string } = { posted: "2026-11-01" },
): Advert {
  return {
    id: advertId(source, sourceId),
    source,
    sourceId,
    title: `Electrical engineer ${sourceId}`,
    company: "Example GmbH",
    location: "Wien",
    country: "at",
    city: "Wien",
    remote: false,
    url: `https://${source}.example/jobs/${sourceId}`,
    description: "",
    ...fields,
    occupationCodes: {},
    language: "de",
    attribution: { licence: "CC BY 4.0", credit: null },
  };
}

const sourceIds = (adverts: readonly { sourceId: string }[]) =>
  adverts.map((a) => a.sourceId);

let directory: string;
let clock: FakeClock;
let store: FileAdvertStore;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "indudex-store-"));
  clock = new FakeClock("2026-11-15T08:00:00Z");
  store = new FileAdvertStore(directory, clock);
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("FileAdvertStore adverts (FR-4, FR-11)", () => {
  it("fits the crawl-core AdvertStore port", () => {
    const port: AdvertStore = store;
    expect(port).toBe(store);
  });

  it("reads nothing for a source never saved", async () => {
    expect(await store.readAdverts("brz")).toEqual([]);
  });

  it("replaces that source's set on save", async () => {
    await store.replaceAdverts("brz", [advert("brz", "1"), advert("brz", "2")]);
    await store.replaceAdverts("brz", [advert("brz", "2"), advert("brz", "3")]);
    expect(sourceIds(await store.readAdverts("brz"))).toEqual(["2", "3"]);
  });

  it("leaves the set unchanged on an empty read", async () => {
    await store.replaceAdverts("brz", [advert("brz", "1")]);
    await store.replaceAdverts("brz", []);
    expect(sourceIds(await store.readAdverts("brz"))).toEqual(["1"]);
  });

  it("leaves other sources untouched", async () => {
    await store.replaceAdverts("brz", [advert("brz", "1")]);
    await store.replaceAdverts("linz", [advert("linz", "9")]);
    const before = await readFile(
      join(directory, "adverts", "brz.json"),
      "utf8",
    );

    await store.replaceAdverts("linz", [advert("linz", "10")]);
    await store.dropAdverts("linz", [advertId("linz", "10")]);

    expect(await readFile(join(directory, "adverts", "brz.json"), "utf8")).toBe(
      before,
    );
  });

  it("keeps the first-seen day across saves", async () => {
    await store.replaceAdverts("brz", [advert("brz", "1")]);
    clock.advance(3 * DAY);
    await store.replaceAdverts("brz", [advert("brz", "1"), advert("brz", "2")]);
    const [first, second] = await store.readAdverts("brz");
    expect(first?.firstSeen).toBe("2026-11-15");
    expect(second?.firstSeen).toBe("2026-11-18");
  });

  it("drops adverts by id", async () => {
    await store.replaceAdverts("brz", [advert("brz", "1"), advert("brz", "2")]);
    await store.dropAdverts("brz", [advertId("brz", "1")]);
    expect(sourceIds(await store.readAdverts("brz"))).toEqual(["2"]);
  });
});

describe("FileAdvertStore expiry (FR-4)", () => {
  it("keeps an advert without expiry date until 2 years after it was posted", async () => {
    await store.replaceAdverts("brz", [
      advert("brz", "1", { posted: "2026-11-01" }),
    ]);

    clock = new FakeClock("2028-11-01T12:00:00Z");
    store = new FileAdvertStore(directory, clock);
    expect(sourceIds(await store.readAdverts("brz"))).toEqual(["1"]);

    clock.advance(DAY);
    expect(await store.readAdverts("brz")).toEqual([]);
  });

  it("counts from the first-seen day when the advert has no posted date", async () => {
    await store.replaceAdverts("brz", [advert("brz", "1", {})]);
    clock.advance((2 * 365 + 1) * DAY - 1);
    expect(sourceIds(await store.readAdverts("brz"))).toEqual(["1"]);
    clock.advance(DAY);
    expect(await store.readAdverts("brz")).toEqual([]);
  });

  it("drops an advert after its own expiry date", async () => {
    await store.replaceAdverts("brz", [
      advert("brz", "1", { expires: "2026-11-20" }),
      advert("brz", "2", { expires: "2026-12-31" }),
    ]);
    clock.advance(6 * DAY);
    expect(sourceIds(await store.readAdverts("brz"))).toEqual(["2"]);
  });

  it("deletes nothing that has not expired when a source fails or reads nothing", async () => {
    await store.replaceAdverts("brz", [
      advert("brz", "1", { expires: "2026-11-20" }),
      advert("brz", "2", { expires: "2026-12-31" }),
    ]);
    // A failed run never calls the store; an empty one passes no adverts.
    await store.replaceAdverts("brz", []);
    expect(sourceIds(await store.readAdverts("brz"))).toEqual(["1", "2"]);
  });

  it("prunes expired adverts from the file on save", async () => {
    clock.advance(10 * DAY);
    await store.replaceAdverts("brz", [
      advert("brz", "1", { expires: "2026-11-20" }),
      advert("brz", "2"),
    ]);
    const file = JSON.parse(
      await readFile(join(directory, "adverts", "brz.json"), "utf8"),
    );
    expect(sourceIds(file.adverts)).toEqual(["2"]);
    expect(file.version).toBe(1);
  });
});

const state = (advertCount: number): SourceState => ({
  status: "enabled",
  lastRunAt: "2026-11-15T08:00:00.000Z",
  advertCount,
  consecutiveFailures: 0,
  unchangedPasses: 0,
  heldDrops: 0,
  nextDueAt: "2026-11-16T08:00:00.000Z",
});

describe("FileAdvertStore source state (FR-10)", () => {
  it("writes and reads back the state of several sources", async () => {
    const failed: SourceState = {
      ...state(3),
      status: "failed",
      reason: "HTTP 503",
      consecutiveFailures: 1,
    };
    await store.writeState("brz", state(42));
    await store.writeState("linz", failed);

    expect(await store.readState("brz")).toEqual(state(42));
    expect(await store.readState("missing")).toBeUndefined();
    expect(await store.readStates()).toEqual(
      new Map([
        ["brz", state(42)],
        ["linz", failed],
      ]),
    );
  });

  it("reads no state before the first run", async () => {
    expect(await store.readStates()).toEqual(new Map());
  });
});

async function corrupt(kind: string, name: string, content: string) {
  await mkdir(join(directory, kind), { recursive: true });
  await writeFile(join(directory, kind, name), content);
}

describe("FileAdvertStore corrupt files", () => {
  it("reports an adverts file that is not JSON, and leaves it as it is", async () => {
    await corrupt("adverts", "brz.json", '{"version": 1, "adv');
    await expect(store.readAdverts("brz")).rejects.toThrow(StoreError);
    await expect(
      store.replaceAdverts("brz", [advert("brz", "1")]),
    ).rejects.toThrow(/brz\.json: corrupt, not valid JSON/);
    expect(await readFile(join(directory, "adverts", "brz.json"), "utf8")).toBe(
      '{"version": 1, "adv',
    );
  });

  it("reports an adverts file of the wrong shape, with the path of the error", async () => {
    await corrupt(
      "adverts",
      "brz.json",
      JSON.stringify({
        version: 1,
        source: "brz",
        savedAt: "2026-11-15T08:00:00Z",
        adverts: [{ id: "x" }],
      }),
    );
    await expect(store.readAdverts("brz")).rejects.toThrow(
      /corrupt, adverts\.0\./,
    );
  });

  it("reports a state file that is corrupt", async () => {
    await corrupt(
      "state",
      "brz.json",
      '{"version": 1, "source": "brz", "state": {}}',
    );
    await expect(store.readState("brz")).rejects.toThrow(
      /state\.json|brz\.json: corrupt/,
    );
    await expect(store.readStates()).rejects.toThrow(StoreError);
  });

  it("refuses a source id that is not one", async () => {
    await expect(store.readAdverts("../etc")).rejects.toThrow(
      /not a source id/,
    );
  });
});

describe("FileAdvertStore source memory (public-feeds FR-4)", () => {
  it("reads nothing before a source remembered anything", async () => {
    expect(await store.readMemory("hungary")).toBeUndefined();
  });

  it("writes and reads back a source's memory in its own file", async () => {
    const memory = { last: "19", categories: { "19": ["1", "2"] } };
    await store.writeMemory("hungary", memory);

    expect(await store.readMemory("hungary")).toEqual(memory);
    expect(
      JSON.parse(
        await readFile(join(directory, "memory", "hungary.json"), "utf8"),
      ),
    ).toEqual({ version: 1, source: "hungary", memory });
  });

  it("refuses a corrupt memory file and never resets it", async () => {
    await mkdir(join(directory, "memory"), { recursive: true });
    await writeFile(join(directory, "memory", "hungary.json"), "{ broken");

    await expect(store.readMemory("hungary")).rejects.toThrow(StoreError);
    expect(
      await readFile(join(directory, "memory", "hungary.json"), "utf8"),
    ).toBe("{ broken");
  });
});
