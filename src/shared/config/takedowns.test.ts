import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { companyKey, loadTakedowns, type TakedownList } from "./takedowns.js";

const sample = `
sources:
  - id: closed-feed
    reason: terms withdrawn
companies:
  - name: Müller & Söhne GmbH
    reason: employer's request
adverts:
  - url: https://jobs.example.com/vacancy/4711/
    reason: employer's request
`;

const advert = (
  overrides: Partial<{ source: string; company: string; url: string }>,
) => ({
  source: "brz",
  company: "Bundesrechenzentrum",
  url: "https://www.brz-jobs.at/Job/1",
  ...overrides,
});

let directory: string;
let takedowns: TakedownList;

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "indudex-takedowns-"));
  await writeFile(join(directory, "takedowns.yml"), sample);
  takedowns = await loadTakedowns(directory);
});

afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("takedowns (FR-8)", () => {
  it("leaves alone an advert no takedown covers", () => {
    expect(takedowns.reasonFor(advert({}))).toBeUndefined();
  });

  it("matches every advert of a source taken down", () => {
    expect(takedowns.sourceReason("closed-feed")).toBe("terms withdrawn");
    expect(takedowns.reasonFor(advert({ source: "closed-feed" }))).toBe(
      "terms withdrawn",
    );
  });

  it("matches a company whatever its case, accents or spacing", () => {
    for (const company of [
      "Müller & Söhne GmbH",
      "MULLER  SOHNE GMBH",
      "müller söhne gmbh.",
    ]) {
      expect(takedowns.reasonFor(advert({ company }))).toBe(
        "employer's request",
      );
    }
    expect(
      takedowns.reasonFor(advert({ company: "Müller Bau GmbH" })),
    ).toBeUndefined();
  });

  it("does not match an advert that names no company", () => {
    expect(takedowns.reasonFor(advert({ company: "" }))).toBeUndefined();
  });

  it("matches an advert by its address, ignoring tracking, fragment and trailing slash", () => {
    for (const url of [
      "https://jobs.example.com/vacancy/4711",
      "https://JOBS.example.com/vacancy/4711/?utm_source=feed",
      "https://jobs.example.com/vacancy/4711#apply",
      "https://jobs.example.com/vacancy/4711?utm_source=a&utm_medium=b&utm_campaign=c",
      "https://jobs.example.com/vacancy/4711?ref=board&gclid=1",
    ]) {
      expect(takedowns.reasonFor(advert({ url }))).toBe("employer's request");
    }
    expect(
      takedowns.reasonFor(
        advert({ url: "https://jobs.example.com/vacancy/4712" }),
      ),
    ).toBeUndefined();
    expect(
      takedowns.reasonFor(
        advert({ url: "https://jobs.example.com/vacancy/4711?id=2" }),
      ),
    ).toBeUndefined();
  });

  it("loads the repo's takedowns file", async () => {
    const repoList = await loadTakedowns();
    expect(repoList.reasonFor(advert({}))).toBeUndefined();
  });

  it("rejects an entry without a reason", async () => {
    await writeFile(
      join(directory, "takedowns.yml"),
      "sources: []\ncompanies: []\nadverts:\n  - url: https://example.com/1\n",
    );
    await expect(loadTakedowns(directory)).rejects.toThrow(
      /adverts\.0\.reason/,
    );
  });
});

describe("keys", () => {
  it("folds company names", () => {
    expect(companyKey(" Ingeniería  Pérez, S.L. ")).toBe(
      "ingenieria perez s l",
    );
  });
});
